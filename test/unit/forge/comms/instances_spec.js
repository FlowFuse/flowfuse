const should = require('should') // eslint-disable-line
const sinon = require('sinon')

const setup = require('../routes/setup')

const FF_UTIL = require('flowforge-test-utils')
const { InstanceCommsHandler } = FF_UTIL.require('forge/comms/instances')

describe('InstanceCommsHandler', function () {
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

    describe('request/instance/expert/insight', function () {
        // This handler bridges FF Expert (MQTT inflight) requests to an MCP server running on a
        // hosted *instance*. It runs a series of ownership/permission checks before forwarding the
        // call to the instance via the container driver (app.containers.callMCPTool/readMCPResource).
        // The MCPRegistration model and app.expert decorator are EE-only, so this block stands up
        // an enterprise-licensed app.
        const license = 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJGbG93Rm9yZ2UgSW5jLiIsInN1YiI6IkZsb3dGb3JnZSBJbmMuIERldmVsb3BtZW50IiwibmJmIjoxNjYyNDIyNDAwLCJleHAiOjc5ODY5MDIzOTksIm5vdGUiOiJEZXZlbG9wbWVudC1tb2RlIE9ubHkuIE5vdCBmb3IgcHJvZHVjdGlvbiIsInVzZXJzIjoxNTAsInRlYW1zIjo1MCwicHJvamVjdHMiOjUwLCJkZXZpY2VzIjo1MCwiZGV2Ijp0cnVlLCJpYXQiOjE2NjI0ODI5ODd9.e8Jeppq4aURwWYz-rEpnXs9RY2Y7HF7LJ6rMtMZWdw2Xls6-iyaiKV1TyzQw5sUBAhdUSZxgtiFH5e_cNJgrUg'

        /** Enterprise-licensed app + test rows for this block */
        const EE = {}
        let eeApp
        let client

        // A read-only, non-destructive tool - accessible to any team role (incl. our owner alice)
        const READONLY_TOOL = { name: 'my_tool', annotations: { readOnlyHint: true, destructiveHint: false } }

        // Build a valid mcpServer descriptor (as sent by the Expert Agent), allowing per-test overrides
        function baseMcpServer (overrides = {}) {
            return {
                team: EE.ATeam.hashid,
                application: EE.application.hashid,
                instance: EE.instance.id, // hosted instances are identified by their (uuid) id
                instanceType: 'instance',
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
                client.emit('request/instance/expert/insight', userId, command, mcpServer, mcpDefinitionKind, mcpDefinition, data, onSuccess, onError)
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
            EE.instance = eeApp.project // an instance owned by EE.application (created in setup)
            // chris is a valid user but NOT a member of ATeam (so has no MCP access)
            EE.chris = await eeApp.db.models.User.create({ username: 'chris', name: 'Chris Kenobi', email: 'chris@example.com', email_verified: true, password: 'ccPassword' })
            // a trusted MCP registration for that instance
            EE.registration = await eeApp.db.models.MCPRegistration.create({
                name: 'instance-mcp',
                protocol: 'http',
                targetType: 'instance',
                targetId: '' + EE.instance.id,
                nodeId: 'mcp:node:instance',
                endpointRoute: '/mcp',
                TeamId: EE.ATeam.id
            })
        })

        after(async function () {
            await eeApp.close()
        })

        beforeEach(function () {
            client = mockSocket()
            // Constructing the handler registers the 'request/instance/expert/insight' listener on the client
            InstanceCommsHandler(eeApp, client)
            // The real call to the instance/container driver is exercised elsewhere; here we assert on
            // what the handler decides to forward, and drive success/failure of the instance call.
            sinon.stub(eeApp.containers, 'callMCPTool').resolves({ ok: 'tool-result' })
            sinon.stub(eeApp.containers, 'readMCPResource').resolves({ ok: 'resource-result' })
        })

        afterEach(function () {
            sinon.restore()
        })

        it('returns MCP_INVALID_REQUEST when the request is not for an instance', async function () {
            const res = await invokeInsight({
                userId: EE.alice.hashid,
                command: 'mcp:call-tool',
                mcpServer: baseMcpServer({ instanceType: 'device' }),
                mcpDefinitionKind: 'mcp_tool',
                mcpDefinition: READONLY_TOOL,
                data: { name: 'my_tool', input: {} }
            })
            res.ok.should.be.false()
            res.code.should.equal('MCP_INVALID_REQUEST')
            eeApp.containers.callMCPTool.called.should.be.false()
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
            eeApp.containers.callMCPTool.called.should.be.false()
        })

        it('returns MCP_INVALID_INSTANCE when the instance does not exist', async function () {
            const res = await invokeInsight({
                userId: EE.alice.hashid,
                command: 'mcp:call-tool',
                mcpServer: baseMcpServer({ instance: '00000000-0000-0000-0000-000000000000' }),
                mcpDefinitionKind: 'mcp_tool',
                mcpDefinition: READONLY_TOOL,
                data: { name: 'my_tool', input: {} }
            })
            res.ok.should.be.false()
            res.code.should.equal('MCP_INVALID_INSTANCE')
            eeApp.containers.callMCPTool.called.should.be.false()
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
            eeApp.containers.callMCPTool.called.should.be.false()
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
            eeApp.containers.callMCPTool.called.should.be.false()
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
            eeApp.containers.callMCPTool.called.should.be.false()
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
            eeApp.containers.callMCPTool.called.should.be.false()
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
            eeApp.containers.callMCPTool.called.should.be.false()
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
            eeApp.containers.callMCPTool.called.should.be.false()
        })

        it('forwards a tool call to the instance and resolves with the result', async function () {
            const res = await invokeInsight({
                userId: EE.alice.hashid,
                command: 'mcp:call-tool',
                mcpServer: baseMcpServer(),
                mcpDefinitionKind: 'mcp_tool',
                mcpDefinition: READONLY_TOOL,
                data: { name: 'my_tool', input: { foo: 'bar' } }
            })
            res.ok.should.be.true()
            res.result.should.deepEqual({ ok: 'tool-result' })

            eeApp.containers.callMCPTool.calledOnce.should.be.true()
            eeApp.containers.readMCPResource.called.should.be.false()
            const args = eeApp.containers.callMCPTool.firstCall.args
            args[0].should.have.property('id', EE.instance.id) // the resolved instance
            args[1].should.have.property('mcpEndpoint', '/mcp') // endpoint
            args[2].should.equal('my_tool') // tool name
            args[3].should.deepEqual({ foo: 'bar' }) // tool input
        })

        it('forwards a resource read to the instance', async function () {
            const res = await invokeInsight({
                userId: EE.alice.hashid,
                command: 'mcp:read-resource',
                mcpServer: baseMcpServer(),
                mcpDefinitionKind: 'mcp_resource',
                mcpDefinition: { uri: 'file:///data.txt' },
                data: { uri: 'file:///data.txt' }
            })
            res.ok.should.be.true()
            res.result.should.deepEqual({ ok: 'resource-result' })

            eeApp.containers.readMCPResource.calledOnce.should.be.true()
            eeApp.containers.callMCPTool.called.should.be.false()
            const args = eeApp.containers.readMCPResource.firstCall.args
            args[0].should.have.property('id', EE.instance.id)
            args[1].should.have.property('mcpEndpoint', '/mcp')
            args[2].should.equal('file:///data.txt') // resource uri
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

            eeApp.containers.readMCPResource.calledOnce.should.be.true()
            const args = eeApp.containers.readMCPResource.firstCall.args
            args[2].should.equal('file:///report.txt') // computed uri
        })

        it('returns MCP_INSIGHT_REQUEST_ERROR when the instance call fails', async function () {
            eeApp.containers.callMCPTool.rejects(new Error('instance unreachable'))
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
            res.message.should.match(/instance unreachable/)
        })
    })
})
