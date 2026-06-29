const sleep = require('util').promisify(setTimeout)

const should = require('should') // eslint-disable-line
const sinon = require('sinon')

const setup = require('../routes/setup')

const FF_UTIL = require('flowforge-test-utils')
const { DeviceCommsHandler } = FF_UTIL.require('forge/comms/devices')

describe('DeviceCommsHandler', function () {
    let app
    let eeApp
    const TestObjects = {}

    async function setupCE () {
        app = await setup()
        await setupTestObjects()
    }

    async function login (username, password) {
        const response = await app.inject({
            method: 'POST',
            url: '/account/login',
            payload: { username, password, remember: false }
        })
        response.cookies.should.have.length(1)
        const temp = { ...response.cookies[0] }
        temp.should.have.property('name', 'sid')
        TestObjects.tokens[username] = response.cookies[0].value
    }

    async function setupTestObjects () {
        // alice : admin
        // ATeam ( alice  (owner) )

        // Alice create in setup()
        TestObjects.alice = await app.db.models.User.byUsername('alice')
        // ATeam create in setup()
        TestObjects.ATeam = await app.db.models.Team.byName('ATeam')
        // Alice set as ATeam owner in setup()

        TestObjects.ProjectA = app.project
        TestObjects.ProjectACredentials = await TestObjects.ProjectA.refreshAuthTokens()

        TestObjects.device = await app.factory.createDevice({
            name: 'device1'
        }, TestObjects.ATeam)

        TestObjects.applicationDevice = await app.factory.createDevice({
            name: 'device2',
            ownerType: 'application'
        }, TestObjects.ATeam)

        TestObjects.tokens = {}
        await login('alice', 'aaPassword')
    }

    before(async function () {
        return setupCE()
    })

    after(async function () {
        await app.close()

        // NOTE: eeApp is intentionally closed here - it shares process-global DB state with
        // the CE app, and closing it mid-file tears down the connection the remaining
        // describes rely on. It is closed once all describes in this file have run. in th top
        // level `after` handler
        if (eeApp) {
            await eeApp.close()
        }
    })
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

    describe('Device Logs', function () {
        it('provide MQTT credentials for Device logs', async function () {
            const response = await app.inject({
                method: 'POST',
                url: `/api/v1/devices/${TestObjects.applicationDevice.hashid}/logs`,
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(200)
            const body = response.json()
            body.should.have.property('url', ':test:')
            body.should.have.property('username')
            body.should.have.property('password')
            body.username.should.startWith('frontend:')
            body.password.should.startWith('ffbf_')
        })
    })

    describe('Device Status', function () {
        let oldHandler
        let client
        beforeEach(function () {
            client = mockSocket()
            const commsHandler = DeviceCommsHandler(app, client)

            oldHandler = app.comms.devices
            app.comms.devices = commsHandler
        })

        after(function () {
            app.comms.devices = oldHandler
        })

        afterEach(function () {
            app.comms.devices.stopLogWatcher()
        })

        it('handles the device is not found', async function () {
            client.emit('status/device', {
                id: 'bad-device-id',
                status: 'online'
            })

            // Task happens async
            await sleep(100)
        })

        it('handles receiving a status payload with unknown objects', async function () {
            client.emit('status/device', {
                id: TestObjects.device.hashid,
                status: JSON.stringify({
                    state: 'online',
                    project: 'unknown-project',
                    application: 'unknown-application',
                    snapshot: 'unknown-snapshot',
                    settings: 'incorrect-settings'
                })
            })

            // Task happens async
            await sleep(100)

            // Should have received update command
            client.received().should.have.length(1)

            const msg = client.received()[0]
            msg.should.have.property('topic', `ff/v1/${TestObjects.ATeam.hashid}/d/${TestObjects.device.hashid}/command`)
            msg.should.have.property('payload')
            const payload = JSON.parse(msg.payload)
            payload.should.have.property('command', 'update')
        })

        it('updates the active snapshot ID if it is found in the database', async function () {
            TestObjects.device.Team = await TestObjects.device.getTeam() // .Team is not loaded in the tests

            const knownSnapshot = await app.db.models.ProjectSnapshot.create({
                name: 'Test Snapshot',
                description: 'Test Description',
                flows: {},
                ApplicationId: TestObjects.device.ApplicationId,
                DeviceId: TestObjects.applicationDevice.id,
                UserId: TestObjects.alice.id
            })

            client.emit('status/device', {
                id: TestObjects.applicationDevice.hashid,
                status: JSON.stringify({
                    state: 'online',
                    snapshot: knownSnapshot.hashid
                })
            })

            // Task happens async
            await sleep(100)

            await TestObjects.applicationDevice.reload()

            TestObjects.applicationDevice.activeSnapshotId.should.equal(knownSnapshot.id)
        })

        it('sends update to clear application device configuration if device agent is older than 1.11.0', async function () {
            client.emit('status/device', {
                id: TestObjects.applicationDevice.hashid,
                status: JSON.stringify({
                    state: 'online',
                    application: 'an-application',
                    snapshot: 'an-snapshot',
                    settings: 'some-settings',
                    agentVersion: '1.14.0'
                })
            })

            // Task happens async
            await sleep(100)

            // Should have received update command
            client.received().should.have.length(1)

            const msg = client.received()[0]
            msg.should.have.property('topic', `ff/v1/${TestObjects.ATeam.hashid}/d/${TestObjects.applicationDevice.hashid}/command`)
            msg.should.have.property('payload')
            const payload = JSON.parse(msg.payload)
            payload.should.have.property('command', 'update')
            payload.should.have.property('project', null)
            payload.should.have.property('snapshot', null)
        })
    })

    describe('request/device/expert/insight', function () {
        // This handler bridges FF Expert (MQTT inflight) requests to an MCP server running on a
        // remote *device*. It runs a series of ownership/permission checks before forwarding the
        // call to the device agent via sendCommandAwaitReply.
        // The MCPRegistration model and app.expert decorator are EE-only, so this block stands up
        // a dedicated enterprise-licensed app rather than reusing the CE app from setupCE().
        const license = 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJGbG93Rm9yZ2UgSW5jLiIsInN1YiI6IkZsb3dGb3JnZSBJbmMuIERldmVsb3BtZW50IiwibmJmIjoxNjYyNDIyNDAwLCJleHAiOjc5ODY5MDIzOTksIm5vdGUiOiJEZXZlbG9wbWVudC1tb2RlIE9ubHkuIE5vdCBmb3IgcHJvZHVjdGlvbiIsInVzZXJzIjoxNTAsInRlYW1zIjo1MCwicHJvamVjdHMiOjUwLCJkZXZpY2VzIjo1MCwiZGV2Ijp0cnVlLCJpYXQiOjE2NjI0ODI5ODd9.e8Jeppq4aURwWYz-rEpnXs9RY2Y7HF7LJ6rMtMZWdw2Xls6-iyaiKV1TyzQw5sUBAhdUSZxgtiFH5e_cNJgrUg'

        /** Enterprise-licensed app + test rows for this block */
        const EE = {}
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

        // after(async function () {})
        // NOTE: eeApp is intentionally not closed here - it shares process-global DB state with
        // the outer CE app, and closing it mid-file tears down the connection the remaining
        // describes rely on. It is closed once all describes in this file have run. in th top
        // level `after` handler

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

        it('returns MCP_INVALID_INSTANCE when the device does not exist', async function () {
            const res = await invokeInsight({
                userId: EE.alice.hashid,
                command: 'mcp:call-tool',
                mcpServer: baseMcpServer({ instance: 999999 }),
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

    describe('sendCommandAwaitReply', async function () {
        let commsHandler
        let client
        before(function () {
            client = mockSocket()
            commsHandler = DeviceCommsHandler(app, client)
        })
        afterEach(function () {
            client.clearReceived()
        })
        after(function () {
            commsHandler.stopLogWatcher()
        })

        it('Times out command', async function () {
            const start = Date.now()
            return commsHandler.sendCommandAwaitReply(TestObjects.ATeam.hashid, TestObjects.device.hashid, 'command', { a: 123 }, { timeout: 200 }).catch(err => {
                // Expect this to reject
                (Date.now() - start).should.be.approximately(200, 30)
                err.message.should.match(/Command timed out/)
            })
        })

        it('sends command to device and blocks until response received', async function () {
            const commandPromise = commsHandler.sendCommandAwaitReply(TestObjects.ATeam.hashid, TestObjects.device.hashid, 'command', { a: 123 }, { timeout: 200 })
            await sleep(5)
            client.received().should.have.length(1)
            const message = client.received()[0]
            message.should.have.property('topic', `ff/v1/${TestObjects.ATeam.hashid}/d/${TestObjects.device.hashid}/command`)
            const payload = JSON.parse(message.payload)
            payload.should.have.property('command', 'command')
            payload.should.have.property('deviceId', TestObjects.device.hashid)
            payload.should.have.property('teamId', TestObjects.ATeam.hashid)
            payload.should.have.property('correlationData')
            payload.should.have.property('createdAt')
            payload.should.have.property('expiresAt')
            payload.should.have.property('responseTopic', `ff/v1/${TestObjects.ATeam.hashid}/d/${TestObjects.device.hashid}/response/test-platform-id`)

            client.emit('response/device', {
                id: TestObjects.device.hashid,
                message: JSON.stringify({
                    command: 'command',
                    correlationData: payload.correlationData,
                    payload: { a: 123 }
                })
            })
            return commandPromise.then(result => {
                result.should.have.property('a', 123)
                return true
            })
        })

        it('sends command to enable device editor', async function () {
            const commandPromise = commsHandler.enableEditor(TestObjects.ATeam.hashid, TestObjects.device.hashid, 'random-token')
            await sleep(5)
            client.received().should.have.length(1)
            const message = client.received()[0]
            message.should.have.property('topic', `ff/v1/${TestObjects.ATeam.hashid}/d/${TestObjects.device.hashid}/command`)
            const payload = JSON.parse(message.payload)
            payload.should.have.property('command', 'startEditor')
            payload.should.have.property('deviceId', TestObjects.device.hashid)
            payload.should.have.property('teamId', TestObjects.ATeam.hashid)
            payload.should.have.property('correlationData')
            payload.should.have.property('createdAt')
            payload.should.have.property('expiresAt')
            payload.should.have.property('responseTopic', `ff/v1/${TestObjects.ATeam.hashid}/d/${TestObjects.device.hashid}/response/test-platform-id`)
            payload.should.have.property('payload')
            payload.payload.should.have.property('token', 'random-token')

            client.emit('response/device', {
                id: TestObjects.device.hashid,
                message: JSON.stringify({
                    command: 'startEditor',
                    correlationData: payload.correlationData,
                    payload: { token: payload.token }
                })
            })
            return commandPromise
        })

        it('sends command to disabled device editor without blocking on response', async function () {
            const commandPromise = commsHandler.disableEditor(TestObjects.ATeam.hashid, TestObjects.device.hashid)
            await sleep(5)
            client.received().should.have.length(1)
            const message = client.received()[0]
            message.should.have.property('topic', `ff/v1/${TestObjects.ATeam.hashid}/d/${TestObjects.device.hashid}/command`)
            const payload = JSON.parse(message.payload)
            payload.should.have.property('command', 'stopEditor')
            return commandPromise
        })
    })
})
