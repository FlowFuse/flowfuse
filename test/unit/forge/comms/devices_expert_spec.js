const should = require('should') // eslint-disable-line
const sinon = require('sinon')

const setup = require('../routes/setup')

const FF_UTIL = require('flowforge-test-utils')
const { DeviceCommsHandler } = FF_UTIL.require('forge/comms/devices')

describe('DeviceCommsHandler', function () {
    /**
     * Get a mocked websocket/socket object. They are 99% the same for the purposes
     * of our tests - only different being one uses 'publish' and one uses 'send'
     */
    function mockSocket () {
        let received = []
        const handlers = {}
        return {
            platformId: 'test-platform-id',
            publish: (topic, payload, opts, callback) => {
                received.push({ topic, payload })
                if (callback) {
                    setImmediate(() => callback())
                }
            },
            send: (data) => {
                received.push(data)
            },
            on: (event, callback) => {
                handlers[event] = callback
            },
            emit: function () {
                const evt = arguments[0]
                const args = Array.prototype.slice.call(arguments, 1)
                handlers[evt].apply(null, args)
            },
            received: () => received,
            clearReceived: () => { received = [] }
        }
    }

    describe('request/device/expert/insight', function () {
        // This handler bridges FF Expert (MQTT inflight) requests to an MCP server running on a
        // remote *device*. It runs a series of ownership/permission checks before forwarding the
        // call to the device agent via sendCommandAwaitReply.
        // The MCPRegistration model and app.expert decorator are EE-only, so this block stands up
        // an enterprise-licensed app. It lives in its own spec file so the process only ever holds
        // a single app - two concurrent apps share one Postgres database and collide on setup.
        const license = 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJGbG93Rm9yZ2UgSW5jLiIsInN1YiI6IkZsb3dGb3JnZSBJbmMuIERldmVsb3BtZW50IiwibmJmIjoxNjYyNDIyNDAwLCJleHAiOjc5ODY5MDIzOTksIm5vdGUiOiJEZXZlbG9wbWVudC1tb2RlIE9ubHkuIE5vdCBmb3IgcHJvZHVjdGlvbiIsInVzZXJzIjoxNTAsInRlYW1zIjo1MCwicHJvamVjdHMiOjUwLCJkZXZpY2VzIjo1MCwiZGV2Ijp0cnVlLCJpYXQiOjE2NjI0ODI5ODd9.e8Jeppq4aURwWYz-rEpnXs9RY2Y7HF7LJ6rMtMZWdw2Xls6-iyaiKV1TyzQw5sUBAhdUSZxgtiFH5e_cNJgrUg'

        /** Enterprise-licensed app + test rows for this block */
        const EE = {}
        let eeApp
        let client
        let commsHandler

        // A read-only, non-destructive tool - accessible to any team role (incl. our owner alice)
        const READONLY_TOOL = { name: 'my_tool', annotations: { readOnlyHint: true, destructiveHint: false } }

        // Build a valid mcpServer descriptor (as sent by the Expert Agent), allowing per-test overrides
        function baseMcpServer (overrides = {}) {
            return {
                team: EE.ATeam.hashid,
                application: EE.application.hashid,
                instance: EE.device.hashid,
                instanceType: 'device',
                mcpServer: EE.registration.hashid,
                mcpEndpoint: '/mcp',
                headers: {},
                ...overrides
            }
        }

        // Emit the inflight request and resolve once the handler calls onSuccess/onError
        function invokeInsight ({ userId, command, mcpServer, mcpDefinitionKind, mcpDefinition, data }) {
            return new Promise((resolve) => {
                const onSuccess = (result) => resolve({ ok: true, result })
                const onError = (message, code, err) => resolve({ ok: false, message, code, err })
                client.emit('request/device/expert/insight', userId, command, mcpServer, mcpDefinitionKind, mcpDefinition, data, onSuccess, onError)
            })
        }

        before(async function () {
            eeApp = await setup({
                license,
                expert: {
                    enabled: true,
                    insights: { enabled: true },
                    service: { url: 'http://localhost:9999', token: 'test-token', requestTimeout: 1000 }
                }
            })
            EE.alice = await eeApp.db.models.User.byUsername('alice') // team owner (created in setup)
            EE.ATeam = eeApp.team
            EE.application = eeApp.application
            // chris is a valid user but NOT a member of ATeam (so has no MCP access)
            EE.chris = await eeApp.db.models.User.create({ username: 'chris', name: 'Chris Kenobi', email: 'chris@example.com', email_verified: true, password: 'ccPassword' })
            // an application-owned device in ATeam
            EE.device = await eeApp.factory.createDevice({ name: 'expert-device', ownerType: 'application' }, EE.ATeam, null, EE.application)
            // a trusted MCP registration for that device
            EE.registration = await eeApp.db.models.MCPRegistration.create({
                name: 'device-mcp',
                protocol: 'http',
                targetType: 'device',
                targetId: '' + EE.device.id,
                nodeId: 'mcp:node:device',
                endpointRoute: '/mcp',
                TeamId: EE.ATeam.id
            })
        })

        after(async function () {
            await eeApp.close()
        })

        beforeEach(function () {
            client = mockSocket()
            commsHandler = DeviceCommsHandler(eeApp, client)
            // The real round-trip to the device agent is exercised elsewhere; here we assert on what
            // the handler decides to forward, and drive success/failure of the device call.
            sinon.stub(commsHandler, 'sendCommandAwaitReply').resolves({ ok: 'device-result' })
        })

        afterEach(function () {
            commsHandler.stopLogWatcher()
            sinon.restore()
        })

        it('returns MCP_INVALID_REQUEST when the request is not for a device', async function () {
            const res = await invokeInsight({
                userId: EE.alice.hashid,
                command: 'mcp:call-tool',
                mcpServer: baseMcpServer({ instanceType: 'instance' }),
                mcpDefinitionKind: 'mcp_tool',
                mcpDefinition: READONLY_TOOL,
                data: { name: 'my_tool', input: {} }
            })
            res.ok.should.be.false()
            res.code.should.equal('MCP_INVALID_REQUEST')
            commsHandler.sendCommandAwaitReply.called.should.be.false()
        })

        it('returns MCP_INVALID_REQUEST when a required field is missing', async function () {
            const res = await invokeInsight({
                userId: EE.alice.hashid,
                command: 'mcp:call-tool',
                mcpServer: baseMcpServer({ team: null }),
                mcpDefinitionKind: 'mcp_tool',
                mcpDefinition: READONLY_TOOL,
                data: { name: 'my_tool', input: {} }
            })
            res.ok.should.be.false()
            res.code.should.equal('MCP_INVALID_REQUEST')
            commsHandler.sendCommandAwaitReply.called.should.be.false()
        })

        it('returns MCP_INVALID_INSTANCE_ID when the instance id is not a string', async function () {
            // Devices are identified by their hashid (a string). A numeric id must be rejected up-front
            // because it would later be used as a cache key, and the redis cache driver rejects
            // non-string keys (the memory driver tolerates them, hiding the bug locally).
            const res = await invokeInsight({
                userId: EE.alice.hashid,
                command: 'mcp:call-tool',
                mcpServer: baseMcpServer({ instance: EE.device.id }), // numeric primary key, not the hashid
                mcpDefinitionKind: 'mcp_tool',
                mcpDefinition: READONLY_TOOL,
                data: { name: 'my_tool', input: {} }
            })
            res.ok.should.be.false()
            res.code.should.equal('MCP_INVALID_INSTANCE_ID')
            commsHandler.sendCommandAwaitReply.called.should.be.false()
        })

        it('returns MCP_INVALID_INSTANCE when the device does not exist', async function () {
            const res = await invokeInsight({
                userId: EE.alice.hashid,
                command: 'mcp:call-tool',
                mcpServer: baseMcpServer({ instance: eeApp.db.models.Device.encodeHashid(999999) }),
                mcpDefinitionKind: 'mcp_tool',
                mcpDefinition: READONLY_TOOL,
                data: { name: 'my_tool', input: {} }
            })
            res.ok.should.be.false()
            res.code.should.equal('MCP_INVALID_INSTANCE')
            commsHandler.sendCommandAwaitReply.called.should.be.false()
        })

        it('returns MCP_NO_REGISTRATION when no MCP registration is found', async function () {
            const res = await invokeInsight({
                userId: EE.alice.hashid,
                command: 'mcp:call-tool',
                mcpServer: baseMcpServer({ mcpServer: 999999 }),
                mcpDefinitionKind: 'mcp_tool',
                mcpDefinition: READONLY_TOOL,
                data: { name: 'my_tool', input: {} }
            })
            res.ok.should.be.false()
            res.code.should.equal('MCP_NO_REGISTRATION')
            commsHandler.sendCommandAwaitReply.called.should.be.false()
        })

        it('returns MCP_INVALID_TEAM_APPLICATION_INSTANCE when the team does not match', async function () {
            const res = await invokeInsight({
                userId: EE.alice.hashid,
                command: 'mcp:call-tool',
                mcpServer: baseMcpServer({ team: 'wrongTeamHashid' }),
                mcpDefinitionKind: 'mcp_tool',
                mcpDefinition: READONLY_TOOL,
                data: { name: 'my_tool', input: {} }
            })
            res.ok.should.be.false()
            res.code.should.equal('MCP_INVALID_TEAM_APPLICATION_INSTANCE')
            commsHandler.sendCommandAwaitReply.called.should.be.false()
        })

        it('returns MCP_INVALID_TEAM_APPLICATION_INSTANCE when the application does not match', async function () {
            const res = await invokeInsight({
                userId: EE.alice.hashid,
                command: 'mcp:call-tool',
                mcpServer: baseMcpServer({ application: 'wrongAppHashid' }),
                mcpDefinitionKind: 'mcp_tool',
                mcpDefinition: READONLY_TOOL,
                data: { name: 'my_tool', input: {} }
            })
            res.ok.should.be.false()
            res.code.should.equal('MCP_INVALID_TEAM_APPLICATION_INSTANCE')
            commsHandler.sendCommandAwaitReply.called.should.be.false()
        })

        it('returns MCP_INVALID_USER when the user cannot be resolved', async function () {
            const res = await invokeInsight({
                userId: 999999,
                command: 'mcp:call-tool',
                mcpServer: baseMcpServer(),
                mcpDefinitionKind: 'mcp_tool',
                mcpDefinition: READONLY_TOOL,
                data: { name: 'my_tool', input: {} }
            })
            res.ok.should.be.false()
            res.code.should.equal('MCP_INVALID_USER')
            commsHandler.sendCommandAwaitReply.called.should.be.false()
        })

        it('returns MCP_NO_ACCESS when the user is not a member of the team', async function () {
            const res = await invokeInsight({
                userId: EE.chris.hashid,
                command: 'mcp:call-tool',
                mcpServer: baseMcpServer(),
                mcpDefinitionKind: 'mcp_tool',
                mcpDefinition: READONLY_TOOL,
                data: { name: 'my_tool', input: {} }
            })
            res.ok.should.be.false()
            res.code.should.equal('MCP_NO_ACCESS')
            commsHandler.sendCommandAwaitReply.called.should.be.false()
        })

        it('returns MCP_NO_ACCESS_TOOL when the requested tool is not in the accessible feature set', async function () {
            const res = await invokeInsight({
                userId: EE.alice.hashid,
                command: 'mcp:call-tool',
                mcpServer: baseMcpServer(),
                mcpDefinitionKind: 'mcp_tool',
                mcpDefinition: READONLY_TOOL,
                data: { name: 'a_different_tool', input: {} }
            })
            res.ok.should.be.false()
            res.code.should.equal('MCP_NO_ACCESS_TOOL')
            commsHandler.sendCommandAwaitReply.called.should.be.false()
        })

        it('forwards a tool call to the device and resolves with the result', async function () {
            const res = await invokeInsight({
                userId: EE.alice.hashid,
                command: 'mcp:call-tool',
                mcpServer: baseMcpServer(),
                mcpDefinitionKind: 'mcp_tool',
                mcpDefinition: READONLY_TOOL,
                data: { name: 'my_tool', input: { foo: 'bar' } }
            })
            res.ok.should.be.true()
            res.result.should.deepEqual({ ok: 'device-result' })

            commsHandler.sendCommandAwaitReply.calledOnce.should.be.true()
            const args = commsHandler.sendCommandAwaitReply.firstCall.args
            args[0].should.equal(EE.ATeam.hashid) // teamId
            args[1].should.equal(EE.device.hashid) // deviceId
            args[2].should.equal('mcp:call-tool') // command
            const commandData = args[3]
            commandData.should.have.property('kind', 'mcp_tool')
            commandData.should.have.property('name', 'my_tool')
            commandData.should.have.property('input').which.deepEqual({ foo: 'bar' })
            commandData.should.have.property('endpoint').which.is.an.Object()
            commandData.endpoint.should.have.property('mcpEndpoint', '/mcp')
            args[4].should.have.property('timeout', 30000)
        })

        it('forwards a resource read to the device', async function () {
            const res = await invokeInsight({
                userId: EE.alice.hashid,
                command: 'mcp:read-resource',
                mcpServer: baseMcpServer(),
                mcpDefinitionKind: 'mcp_resource',
                mcpDefinition: { uri: 'file:///data.txt' },
                data: { uri: 'file:///data.txt' }
            })
            res.ok.should.be.true()
            res.result.should.deepEqual({ ok: 'device-result' })

            commsHandler.sendCommandAwaitReply.calledOnce.should.be.true()
            const commandData = commsHandler.sendCommandAwaitReply.firstCall.args[3]
            commandData.should.have.property('kind', 'mcp_resource')
            commandData.should.have.property('uri', 'file:///data.txt')
        })

        it('resolves a resource template URI from the template + input before forwarding', async function () {
            const res = await invokeInsight({
                userId: EE.alice.hashid,
                command: 'mcp:read-resource',
                mcpServer: baseMcpServer(),
                mcpDefinitionKind: 'mcp_resource_template',
                mcpDefinition: { uriTemplate: 'file:///{name}.txt' },
                // no resolved uri provided - the handler must compute it from the template + input
                data: { uriTemplate: 'file:///{name}.txt', input: { name: 'report' } }
            })
            res.ok.should.be.true()

            commsHandler.sendCommandAwaitReply.calledOnce.should.be.true()
            const commandData = commsHandler.sendCommandAwaitReply.firstCall.args[3]
            commandData.should.have.property('kind', 'mcp_resource_template')
            commandData.should.have.property('uri', 'file:///report.txt')
        })

        it('returns MCP_INSIGHT_REQUEST_ERROR when the device command fails', async function () {
            commsHandler.sendCommandAwaitReply.rejects(new Error('device unreachable'))
            const res = await invokeInsight({
                userId: EE.alice.hashid,
                command: 'mcp:call-tool',
                mcpServer: baseMcpServer(),
                mcpDefinitionKind: 'mcp_tool',
                mcpDefinition: READONLY_TOOL,
                data: { name: 'my_tool', input: {} }
            })
            res.ok.should.be.false()
            res.code.should.equal('MCP_INSIGHT_REQUEST_ERROR')
            res.message.should.match(/device unreachable/)
        })
    })
})
