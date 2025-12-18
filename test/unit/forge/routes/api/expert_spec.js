const { default: axios } = require('axios')
const should = require('should') // eslint-disable-line
const sinon = require('sinon')

const { Roles } = require('../../../../../forge/lib/roles.js')
// eslint-disable-next-line no-unused-vars
const TestModelFactory = require('../../../../lib/TestModelFactory')
const setup = require('../setup')

describe('Expert API', function () {
    async function setupApp (config = {}) {
        const defaultConfig = {
            license: 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJGbG93Rm9yZ2UgSW5jLiIsInN1YiI6IkZsb3dGb3JnZSBJbmMuIERldmVsb3BtZW50IiwibmJmIjoxNjYyNTk1MjAwLCJleHAiOjc5ODcwNzUxOTksIm5vdGUiOiJEZXZlbG9wbWVudC1tb2RlIE9ubHkuIE5vdCBmb3IgcHJvZHVjdGlvbiIsInVzZXJzIjoxNTAsInRlYW1zIjo1MCwicHJvamVjdHMiOjUwLCJkZXZpY2VzIjoyLCJkZXYiOnRydWUsImlhdCI6MTY2MjY1MzkyMX0.Tj4fnuDuxi_o5JYltmVi1Xj-BRn0aEjwRPa_fL2MYa9MzSwnvJEd-8bsRM38BQpChjLt-wN-2J21U7oSq2Fp5A',
            expert: {
                enabled: true,
                service: {
                    url: 'http://localhost:9999',
                    token: 'test-token',
                    requestTimeout: 1000
                }
            }
        }
        const mergedConfig = Object.assign({}, defaultConfig, config)
        const _app = await setup(mergedConfig)
        _app.comms = null
        return _app
    }

    async function login (app, username, password) {
        const response = await app.inject({
            method: 'POST',
            url: '/account/login',
            payload: { username, password, remember: false }
        })
        response.cookies.should.have.length(1)
        response.cookies[0].should.have.property('name', 'sid')
        return response.cookies[0].value
    }

    describe('service disabled', async function () {
        let app
        afterEach(async function () {
            if (app) await app.close()
        })
        it('should return 501 if expert service is disabled', async function () {
            app = await setupApp({ expert: { enabled: false } })
            const instance = app.project
            const token = (await instance.refreshAuthTokens()).token
            sinon.stub(app.config.expert, 'enabled').get(() => false)
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/expert/chat',
                headers: { authorization: 'Bearer ' + token },
                payload: { context: { team: 'teamid' }, query: 'test' }
            })
            response.statusCode.should.equal(501)
        })
        it('should return 501 if expert service url is not set', async function () {
            app = await setupApp({ expert: { enabled: true, service: { url: null } } })
            const instance = app.project
            const token = (await instance.refreshAuthTokens()).token
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/expert/chat',
                headers: { authorization: 'Bearer ' + token },
                payload: { context: { team: 'teamid' }, query: 'test' }
            })
            response.statusCode.should.equal(501)
        })
    })

    describe('service enabled', function () {
        let app
        /** @type {TestModelFactory} */
        let factory = null
        let instanceToken, deviceToken, team, instance, device, application
        /** Alice is the team owner */
        let aliceToken
        /** Bob is a regular user */
        let bobToken
        /** Chris is a non-team member */
        let chrisToken

        before(async function () {
            app = await setupApp()
            factory = app.factory
            team = app.team
            application = app.application
            instance = app.project
            instanceToken = (await instance.refreshAuthTokens()).token
            device = await factory.createDevice({ name: 'device-app-one-abc' }, team, null, application)
            deviceToken = (await device.refreshAuthTokens()).token

            // add bob and chris users
            // - bob is team owner of "team"
            // - chris is not a member of "team"
            // NB: Alice is already set as team owner in setup()
            const bob = await app.db.models.User.create({ username: 'bob', name: 'Bob Solo', email: 'bob@example.com', email_verified: true, password: 'bbPassword' })
            await team.addUser(bob, { through: { role: Roles.Owner } })
            await app.db.models.User.create({ username: 'chris', name: 'Chris Kenobi', email: 'chris@example.com', email_verified: true, password: 'ccPassword' })

            // Login users (get session tokens)
            aliceToken = await login(app, 'alice', 'aaPassword')
            bobToken = await login(app, 'bob', 'bbPassword')
            chrisToken = await login(app, 'chris', 'ccPassword')
        })

        after(async function () { await app.close() })
        afterEach(function () { sinon.restore() })

        describe('Chat Endpoint', function () {
            it('should return 401 for missing session', async function () {
                const response = await app.inject({
                    method: 'POST',
                    url: '/api/v1/expert/chat',
                    payload: { context: { team: team.hashid }, query: 'test' },
                    headers: { authorization: 'Bearer ' + aliceToken }
                })
                response.statusCode.should.equal(401)
            })

            it('should return 401 for device token', async function () {
                const token = deviceToken
                const response = await app.inject({
                    method: 'POST',
                    url: '/api/v1/expert/chat',
                    headers: { authorization: 'Bearer ' + token },
                    payload: { context: { team: 'not-a-team' }, query: 'test' }
                })
                response.statusCode.should.equal(401)
            })

            it('should return 401 for project token', async function () {
                const token = instanceToken
                const response = await app.inject({
                    method: 'POST',
                    url: '/api/v1/expert/chat',
                    headers: { authorization: 'Bearer ' + token },
                    payload: { context: { team: 'not-a-team' }, query: 'test' }
                })
                response.statusCode.should.equal(401)
            })

            it('should return 404 if user not in team', async function () {
                const token = aliceToken
                // sinon.stub(app.db.models.User, 'byId').resolves({ getTeamMembership: async () => null })
                const response = await app.inject({
                    method: 'POST',
                    url: '/api/v1/expert/chat',
                    cookies: { sid: token },
                    payload: { context: { team: 'not-a-team' }, query: 'test' }
                })
                response.statusCode.should.equal(404)
            })

            it('should return 404 if team is not specified', async function () {
                const token = aliceToken
                const response = await app.inject({
                    method: 'POST',
                    url: '/api/v1/expert/chat',
                    cookies: { sid: token },
                    payload: { context: {}, query: 'test' }
                })
                response.statusCode.should.equal(404)
            })

            it('should return 200 and proxy to expert service', async function () {
                const token = aliceToken
                sinon.stub(axios, 'post').resolves({ data: { result: 'ok', transactionId: 'abc' } })
                const response = await app.inject({
                    method: 'POST',
                    url: '/api/v1/expert/chat',
                    cookies: { sid: token },
                    headers: { 'x-chat-transaction-id': 'abc' },
                    payload: { context: { team: team.hashid }, query: 'test' }
                })
                response.statusCode.should.equal(200)
                response.json().should.have.property('result', 'ok')
            })

            it('should return 500 if transactionId mismatches', async function () {
                const token = aliceToken
                sinon.stub(axios, 'post').resolves({ data: { transactionId: 'wrong' } })
                const response = await app.inject({
                    method: 'POST',
                    url: '/api/v1/expert/chat',
                    cookies: { sid: token },
                    headers: { 'x-chat-transaction-id': 'right' },
                    payload: { context: { team: team.hashid }, query: 'test' }
                })
                response.statusCode.should.equal(500)
            })
        })

        describe('MCP features Endpoint', function () {
            it('should return 401 for instance token', async function () {
                const token = instanceToken
                const response = await app.inject({
                    method: 'POST',
                    url: '/api/v1/expert/mcp/features',
                    cookies: { sid: token },
                    payload: { context: { team: 'not-a-team' }, query: 'test' },
                    headers: { 'x-chat-transaction-id': 'abc' }
                })
                response.statusCode.should.equal(401)
            })

            it('should return 401 for device token', async function () {
                const token = deviceToken
                const response = await app.inject({
                    method: 'POST',
                    url: '/api/v1/expert/mcp/features',
                    cookies: { sid: token },
                    payload: { context: { team: 'not-a-team' }, query: 'test' },
                    headers: { 'x-chat-transaction-id': 'abc' }
                })
                response.statusCode.should.equal(401)
            })

            it('should return 404 for non-team member', async function () {
                const token = chrisToken
                const response = await app.inject({
                    method: 'POST',
                    url: '/api/v1/expert/mcp/features',
                    cookies: { sid: token },
                    payload: { context: { team: team.hashid } },
                    headers: { 'x-chat-transaction-id': 'abc' }
                })
                response.statusCode.should.equal(404)
            })

            // missing transactionId header should cause 400 due to schema validation
            it('should return 400 if missing header x-chat-transaction-id', async function () {
                const token = bobToken
                const mcpByTeam = sinon.stub(app.db.models.MCPRegistration, 'byTeam').resolves([]) // should not be called
                const post = sinon.stub(axios, 'post') // should not be called
                const response = await app.inject({
                    method: 'POST',
                    url: '/api/v1/expert/mcp/features',
                    cookies: { sid: token },
                    payload: { context: { team: team.hashid } }
                })
                response.statusCode.should.equal(400)
                mcpByTeam.called.should.be.false()
                post.called.should.be.false()
            })

            // missing team in payload should cause 400 due to schema validation
            it('should return 400 if missing team in payload context', async function () {
                const token = bobToken
                const mcpByTeam = sinon.stub(app.db.models.MCPRegistration, 'byTeam').resolves([]) // should not be called
                const post = sinon.stub(axios, 'post') // should not be called
                const response = await app.inject({
                    method: 'POST',
                    url: '/api/v1/expert/mcp/features',
                    cookies: { sid: token },
                    payload: { context: { team: null } },
                    headers: { 'x-chat-transaction-id': 'abc' }
                })
                response.statusCode.should.equal(400)
                mcpByTeam.called.should.be.false()
                post.called.should.be.false()
            })

            // if mcpRegistrations is empty, should return 200 and empty features array
            it('should return early with status 200 and empty servers array when there are no MCP registrations', async function () {
                const token = bobToken
                sinon.stub(app.db.models.MCPRegistration, 'byTeam').resolves([])
                const post = sinon.stub(axios, 'post') // should not be called
                const response = await app.inject({
                    method: 'POST',
                    url: '/api/v1/expert/mcp/features',
                    cookies: { sid: token },
                    payload: { context: { team: team.hashid } },
                    headers: { 'x-chat-transaction-id': 'abc' }
                })
                response.statusCode.should.equal(200)
                const json = response.json()
                json.should.deepEqual({ servers: [], transactionId: 'abc' })
                post.called.should.be.false()
            })

            it('should get mcp features for team member', async function () {
                const token = bobToken
                // Stub 3 MCP registrations: 1 online, 1 offline, 1 other-team-online
                // It should only send results for the online instances that belong to the correct team
                sinon.stub(app.db.models.MCPRegistration, 'byTeam').resolves([
                    {
                        id: 1,
                        name: 'mcp-server-1',
                        protocol: 'http',
                        targetType: 'instance',
                        targetId: instance.id,
                        nodeId: 'mcp:node:1',
                        endpointRoute: '/mcp1',
                        TeamId: team.id,
                        Project: instance,
                        title: 'the title 1',
                        version: '1.0.0-beta',
                        description: 'the description 1'

                    }, {
                        id: 2, // should be excluded since it is offline
                        name: 'mcp-server-2',
                        protocol: 'http',
                        targetType: 'instance',
                        targetId: 'acbd-1234',
                        nodeId: 'mcp:node:1',
                        endpointRoute: '/mcp2',
                        TeamId: team.id,
                        Project: {
                            id: 'acbd-1234',
                            name: 'offline-instance',
                            liveState: () => ({ meta: { state: 'suspended' } })
                        },
                        title: 'the title 2',
                        version: '2.0.0-beta',
                        description: 'the description 2'

                    }, {
                        id: 3, // should be excluded since it is for other team
                        name: 'mcp-server-3',
                        protocol: 'http',
                        targetType: 'instance',
                        targetId: 'acbd-1234',
                        nodeId: 'mcp:node:1',
                        endpointRoute: '/mcp2',
                        TeamId: 999, // other team
                        Project: {
                            id: 'wxyz-6789',
                            name: 'offline-instance',
                            liveState: () => ({ meta: { state: 'running' } })
                        },
                        title: 'the title 3',
                        version: '3.0.0-beta',
                        description: 'the description 3'
                    }
                ])
                // fake online status by stubbing liveState
                sinon.stub(instance, 'liveState').returns({ meta: { state: 'running' } })

                sinon.stub(axios, 'post').resolves({
                    data: {
                        transactionId: 'abc',
                        servers: [
                            {
                                team: team.hashid,
                                instance: instance.id,
                                instanceType: 'instance',
                                instanceName: instance.name,
                                mcpServerName: 'mcp-server-1',
                                mcpServerUrl: 'http://instance-url/mcp1',
                                prompts: [{}],
                                resources: [{}],
                                resourceTemplates: [{}],
                                tools: [{}],
                                mcpProtocol: 'http',
                                title: 'the title 1',
                                version: '1.0.0-beta',
                                description: 'the description 1',
                                notInSchema: 'should not cause error or be included in response due to swagger schema'
                            }
                        ]
                    }
                })
                const response = await app.inject({
                    method: 'POST',
                    url: '/api/v1/expert/mcp/features',
                    cookies: { sid: token },
                    headers: { 'x-chat-transaction-id': 'abc' },
                    payload: { context: { team: team.hashid } }
                })
                response.statusCode.should.equal(200)

                // check that the post data to expert service was correct
                const axiosPost = axios.post.getCall(0).args[1]
                axiosPost.should.have.property('teamId', team.hashid)
                axiosPost.should.have.property('servers').which.is.an.Array().and.has.length(1)
                // since only 1 instance was correct and online, get index 0 and check its properties
                const reg = axiosPost.servers[0]
                reg.should.only.have.keys('team', 'instance', 'instanceType', 'instanceName', 'instanceUrl', 'mcpServerName', 'mcpEndpoint', 'mcpProtocol', 'title', 'version', 'description')
                reg.should.have.property('team', team.hashid)
                reg.should.have.property('instance', instance.id)
                reg.should.have.property('instanceType', 'instance')
                reg.should.have.property('instanceName', instance.name)
                reg.should.have.property('instanceUrl', instance.url)
                reg.should.have.property('mcpServerName', 'mcp-server-1')
                reg.should.have.property('mcpEndpoint', '/mcp1')
                reg.should.have.property('mcpProtocol', 'http')
                reg.should.have.property('title', 'the title 1')
                reg.should.have.property('version', '1.0.0-beta')
                reg.should.have.property('description', 'the description 1')

                // check the response from our API
                const result = response.json()
                result.should.have.property('transactionId', 'abc')
                result.should.have.property('servers').which.is.an.Array().and.has.length(1)
                result.servers[0].should.only.have.keys('team', 'instance', 'instanceType', 'instanceName', 'mcpServerName', 'prompts', 'resources', 'resourceTemplates', 'tools', 'mcpProtocol', 'mcpServerUrl', 'title', 'version', 'description')
                result.servers[0].should.have.property('team', team.hashid)
                result.servers[0].should.have.property('instance', instance.id)
                result.servers[0].should.have.property('instanceType', 'instance')
                result.servers[0].should.have.property('instanceName', instance.name)
                result.servers[0].should.have.property('mcpServerName', 'mcp-server-1')
                result.servers[0].should.have.property('title', 'the title 1')
                result.servers[0].should.have.property('version', '1.0.0-beta')
                result.servers[0].should.have.property('description', 'the description 1')
            })

            it('should return 500 if transactionId mismatches', async function () {
                const token = bobToken
                sinon.stub(axios, 'post').resolves({ data: { transactionId: 'wrong' } })
                // fake 1 registration to avoid early return
                sinon.stub(app.db.models.MCPRegistration, 'byTeam').resolves([{
                    id: 1,
                    name: 'mcp-server-1',
                    protocol: 'http',
                    targetType: 'instance',
                    targetId: instance.id,
                    nodeId: 'mcp:node:1',
                    endpointRoute: '/mcp1',
                    TeamId: team.id,
                    Project: instance
                }])
                sinon.stub(instance, 'liveState').returns({ meta: { state: 'running' } })

                const response = await app.inject({
                    method: 'POST',
                    url: '/api/v1/expert/mcp/features',
                    cookies: { sid: token },
                    headers: { 'x-chat-transaction-id': 'right' },
                    payload: { context: { team: team.hashid } }
                })
                response.statusCode.should.equal(500)
            })
        })
    })
})
