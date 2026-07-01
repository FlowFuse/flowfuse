const { default: axios } = require('axios')

const should = require('should') // eslint-disable-line
const sinon = require('sinon')

const { sha256 } = require('../../../../../../forge/db/utils.js')
const { Roles } = require('../../../../../../forge/lib/roles.js')
// eslint-disable-next-line no-unused-vars
const TestModelFactory = require('../../../../../lib/TestModelFactory.js')
const setup = require('../../../routes/setup.js')

describe('Expert API', function () {
    async function setupApp (config = {}) {
        const defaultConfig = {
            // Enable dev license for granular rbac tests
            license: 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJGbG93Rm9yZ2UgSW5jLiIsInN1YiI6IkZsb3dGb3JnZSBJbmMuIERldmVsb3BtZW50IiwibmJmIjoxNjYyNDIyNDAwLCJleHAiOjc5ODY5MDIzOTksIm5vdGUiOiJEZXZlbG9wbWVudC1tb2RlIE9ubHkuIE5vdCBmb3IgcHJvZHVjdGlvbiIsInVzZXJzIjoxNTAsInRlYW1zIjo1MCwicHJvamVjdHMiOjUwLCJkZXZpY2VzIjo1MCwiZGV2Ijp0cnVlLCJpYXQiOjE2NjI0ODI5ODd9.e8Jeppq4aURwWYz-rEpnXs9RY2Y7HF7LJ6rMtMZWdw2Xls6-iyaiKV1TyzQw5sUBAhdUSZxgtiFH5e_cNJgrUg',
            expert: {
                enabled: true,
                insights: {
                    enabled: true
                },
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
        const temp = { ...response.cookies[0] }
        temp.should.have.property('name', 'sid')
        return response.cookies[0].value
    }

    async function setFeatureForTeam (app, featureName, enabled) {
        // modify the teamType to enable teamHttpSecurity feature
        const defaultTeamTypeProperties = app.defaultTeamType.properties
        defaultTeamTypeProperties.features[featureName] = enabled
        app.defaultTeamType.properties = defaultTeamTypeProperties
        await app.defaultTeamType.save()
    }

    // Create a real MCP registration row for an instance so that the /chat route's trusted-registry
    // re-resolution finds it. TeamId is derived from the instance (no need to stub byTeam).
    async function createMcpRegistration (app, instance, { name, endpointRoute = '/mcp', protocol = 'http', nodeId } = {}) {
        return app.db.models.MCPRegistration.create({
            name,
            protocol,
            targetType: 'instance',
            targetId: '' + instance.id,
            nodeId: nodeId || `mcp:node:${name}`,
            endpointRoute,
            TeamId: instance.TeamId
        })
    }

    afterEach(async function () {
        sinon.restore()
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

        afterEach(async function () {
            // clear the expert MCP access token cache
            await app.expert.mcp.clearTokenCache()
            // remove any MCP registrations created during tests
            await app.db.models.MCPRegistration.destroy({ where: {} })
            // delete all extra users, applications, instances created during tests
            await app.db.models.Project.destroy({ where: { name: ['alice2-instance', 'bob2-instance', 'chris2-instance'] } })
            await app.db.models.Application.destroy({ where: { name: ['application-alice', 'application-bob', 'application-chris'] } })
            await app.db.models.User.destroy({ where: { username: ['alice2', 'bob2', 'chris2'] } })

            sinon.restore()
            // remove all access tokens
            return app.db.models.AccessToken.destroy({ where: {} })
        })

        describe('Chat Endpoint', function () {
            /** The MCP registration created for the default instance in beforeEach */
            let defaultMcpRegistration
            beforeEach(async function () {
                // register an MCP server for the default instance so the /chat trusted-registry
                // re-resolution recognises selectedCapabilities that reference it (mcpServer hashid)
                defaultMcpRegistration = await createMcpRegistration(app, instance, { name: 'mcp-server-1', endpointRoute: '/mcp1' })
            })

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
                    payload: { context: { teamId: team.hashid }, query: 'test' }
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
                    payload: { context: { teamId: team.hashid }, query: 'test' }
                })
                response.statusCode.should.equal(500)
            })

            it('should include only permitted mcp features when granular RBACs is enabled', async function () {
                // PREMISE: 3 applications (appAlice2, appBob2, appChris), 3 users (userAlice2, userBob2, userChris2), 1 team
                // - Each application has mcp tool "destructive_tool", "write_tool", "read_tool", "openworld_tool"
                // - each user is an owner of same named application (userAlice2 owns appAlice2, etc)
                // - Alice2 is a owner of appBob2 and downgraded to be a member of appChris2
                // - Bob2 is downgraded to member of appChris2 and viewer to appAlice2
                // - Chris2 is upgraded to owner of appChris2 and a downgraded to viewer to appBob2 (has no access to appAlice2)
                // EXPECTATION:
                // - when Alice2 requests MCP features, she should get all features in appBob2 plus any non-destructive features from appChris2
                // - when Bob2 requests MCP features, he should get all features in appBob2 plus write and openworld features from appChris2 and read features from appAlice2
                // - when Chris2 requests MCP features, he should only features from appChris2 plus read features from appBob2 (nothing from appAlice2)

                // create 3 applications
                const applicationAlice2 = await app.factory.createApplication({ name: 'application-alice' }, team)
                const applicationBob2 = await app.factory.createApplication({ name: 'application-bob' }, team)
                const applicationChris2 = await app.factory.createApplication({ name: 'application-chris' }, team)

                // create users
                const alice2 = await await app.db.models.User.create({ username: 'alice2', name: 'Alice Two', email: 'alice2@example.com', email_verified: true, password: 'aaPassword' })
                const bob2 = await app.db.models.User.create({ username: 'bob2', name: 'Bob Two', email: 'bob2@example.com', email_verified: true, password: 'bbPassword' })
                const chris2 = await app.db.models.User.create({ username: 'chris2', name: 'Chris Two', email: 'chris2@example.com', email_verified: true, password: 'ccPassword' })

                // set alice2 as an owner of ATeam
                await team.addUser(alice2, { through: { role: Roles.Owner } })
                // set bob as an owner of ATeam
                await team.addUser(bob2, { through: { role: Roles.Owner } })
                // set chris as a member of ATeam
                await team.addUser(chris2, { through: { role: Roles.Member } })

                const alice2Token = await login(app, 'alice2', 'aaPassword')
                const bob2Token = await login(app, 'bob2', 'bbPassword')
                const chris2Token = await login(app, 'chris2', 'ccPassword')

                const alice2TeamMembership = await app.db.models.TeamMember.findOne({ where: { TeamId: team.id, UserId: alice2.id } })
                alice2TeamMembership.permissions = {
                    applications: { [applicationAlice2.hashid]: Roles.Owner, [applicationBob2.hashid]: Roles.Owner, [applicationChris2.hashid]: Roles.Member }
                }
                await alice2TeamMembership.save()

                const bob2TeamMembership = await app.db.models.TeamMember.findOne({ where: { TeamId: team.id, UserId: bob2.id } })
                bob2TeamMembership.permissions = {
                    applications: { [applicationAlice2.hashid]: Roles.Viewer, [applicationBob2.hashid]: Roles.Owner, [applicationChris2.hashid]: Roles.Member }
                }
                await bob2TeamMembership.save()

                const chris2TeamMembership = await app.db.models.TeamMember.findOne({ where: { TeamId: team.id, UserId: chris2.id } })
                chris2TeamMembership.permissions = {
                    applications: { [applicationAlice2.hashid]: Roles.None, [applicationBob2.hashid]: Roles.Viewer, [applicationChris2.hashid]: Roles.Owner }
                }
                await chris2TeamMembership.save()

                // create instances for each application
                const instanceAlice2 = await await app.factory.createInstance(
                    { name: 'alice2-instance' },
                    applicationAlice2,
                    app.stack,
                    app.template,
                    app.projectType,
                    { start: true }
                )
                const instanceBob2 = await app.factory.createInstance(
                    { name: 'bob2-instance' },
                    applicationBob2,
                    app.stack,
                    app.template,
                    app.projectType,
                    { start: true }
                )
                const instanceChris2 = await app.factory.createInstance(
                    { name: 'chris2-instance' },
                    applicationChris2,
                    app.stack,
                    app.template,
                    app.projectType,
                    { start: true }
                )

                // register a (trusted) MCP server for each instance so the /chat route's registry
                // re-resolution recognises the selectedCapabilities referencing them
                const regAlice2 = await createMcpRegistration(app, instanceAlice2, { name: 'alice2' })
                const regBob2 = await createMcpRegistration(app, instanceBob2, { name: 'bob2' })
                const regChris2 = await createMcpRegistration(app, instanceChris2, { name: 'chris2' })

                const buildMcpServerFeaturesResponse = (name, applicationHashid, instance, instanceType, mcpServer) => ({
                    team: team.hashid,
                    application: applicationHashid,
                    instance: instanceType === 'instance' ? instance.id : instance.hashid,
                    instanceType,
                    instanceName: instance.name,
                    mcpProtocol: 'http',
                    mcpServer, // the MCP registration hashid - re-resolved against the trusted registry
                    mcpServerName: name,
                    mcpServerUrl: `http://${name}/mcp`,
                    prompts: [],
                    resources: [],
                    resourceTemplates: [],
                    tools: [
                        {
                            name: 'destructive_tool',
                            annotations: {
                                destructiveHint: true,
                                readOnlyHint: false,
                                openWorldHint: false,
                                idempotentHint: false
                            }
                        },
                        {
                            name: 'write_tool',
                            annotations: {
                                destructiveHint: false,
                                readOnlyHint: false,
                                openWorldHint: false,
                                idempotentHint: false
                            }
                        },
                        {
                            name: 'read_tool',
                            annotations: {
                                destructiveHint: false,
                                readOnlyHint: true,
                                openWorldHint: false,
                                idempotentHint: false
                            }
                        },
                        {
                            name: 'openworld_tool',
                            description: 'An openworld tool',
                            type: 'tool',
                            annotations: {
                                destructiveHint: false,
                                readOnlyHint: false,
                                openWorldHint: true,
                                idempotentHint: false
                            }
                        }
                    ],
                    title: `${name} MCP Server`,
                    version: '1.0.0-beta',
                    description: `${name} MCP Server`
                })

                const buildChatRequestPayload = (user, application, instance, query = 'test query') => ({
                    query,
                    context: {
                        agent: 'operator-agent',
                        userId: user.hashid,
                        teamId: team.hashid,
                        instanceId: instance.hashid,
                        deviceId: null,
                        applicationId: application.hashid,
                        pageName: 'instance-editor-expert',
                        scope: 'immersive',
                        selectedCapabilities: [
                            buildMcpServerFeaturesResponse('alice2', applicationAlice2.hashid, instanceAlice2, 'instance', regAlice2.hashid), // an mcp server on alice2 instance
                            buildMcpServerFeaturesResponse('bob2', applicationBob2.hashid, instanceBob2, 'instance', regBob2.hashid), // an mcp server on bob2 instance
                            buildMcpServerFeaturesResponse('chris2', applicationChris2.hashid, instanceChris2, 'instance', regChris2.hashid) // an mcp server on chris2 instance
                        ]
                    }
                })

                // Stub axios to return chat response and capture posted data
                const capturedPosts = {}
                sinon.stub(axios, 'post').callsFake((url, data) => {
                    capturedPosts[data.context.userId] = data
                    return Promise.resolve({
                        data: {
                            transactionId: 'right',
                            answer: []
                        }
                    })
                })

                // Helper function to check that the returned tools match expected tool names
                const checkTools = (serverResult, expectedToolNames) => {
                    const toolNames = serverResult.tools.map(t => t.name)
                    toolNames.should.have.length(expectedToolNames.length)
                    expectedToolNames.forEach(name => {
                        toolNames.should.containEql(name)
                    })
                }

                // --- Alice2 Request ---
                const alice2ChatResponse = await app.inject({
                    method: 'POST',
                    url: '/api/v1/expert/chat',
                    cookies: { sid: alice2Token },
                    headers: { 'x-chat-transaction-id': 'right' },
                    payload: buildChatRequestPayload(alice2, applicationAlice2, instanceAlice2)
                })

                alice2ChatResponse.statusCode.should.equal(200)

                // analyse capturedPostData to see what MCP features were sent
                const alice2CapturedPost = capturedPosts[alice2.hashid]
                should.exist(alice2CapturedPost)
                alice2CapturedPost.should.have.property('context').which.is.an.Object()
                alice2CapturedPost.context.should.have.property('selectedCapabilities').which.is.an.Array()
                alice2CapturedPost.context.selectedCapabilities.should.have.length(3) // alice has access to all 3 servers
                // alice2 should get all tools from bob-instance plus non-destructive tools from chris-instance
                checkTools(alice2CapturedPost.context.selectedCapabilities.find(s => s.instance === instanceAlice2.id), ['destructive_tool', 'write_tool', 'read_tool', 'openworld_tool'])
                checkTools(alice2CapturedPost.context.selectedCapabilities.find(s => s.instance === instanceBob2.id), ['destructive_tool', 'write_tool', 'read_tool', 'openworld_tool'])
                checkTools(alice2CapturedPost.context.selectedCapabilities.find(s => s.instance === instanceChris2.id), ['write_tool', 'read_tool', 'openworld_tool'])

                // --- Bob2 Request ---
                const bob2ChatResponse = await app.inject({
                    method: 'POST',
                    url: '/api/v1/expert/chat',
                    cookies: { sid: bob2Token },
                    headers: { 'x-chat-transaction-id': 'right' },
                    payload: buildChatRequestPayload(bob2, applicationBob2, instanceBob2)
                })

                bob2ChatResponse.statusCode.should.equal(200)

                // analyse capturedPostData to see what MCP features were sent
                const bob2CapturedPost = capturedPosts[bob2.hashid]
                should.exist(bob2CapturedPost)
                bob2CapturedPost.should.have.property('context').which.is.an.Object()
                bob2CapturedPost.context.should.have.property('selectedCapabilities').which.is.an.Array()
                bob2CapturedPost.context.selectedCapabilities.should.have.length(3) // bob2 has access to all 3 servers
                // bob2 should get all tools from bob-instance plus write/openworld tools from chris-instance plus read tool from alice-instance
                checkTools(bob2CapturedPost.context.selectedCapabilities.find(s => s.instance === instanceAlice2.id), ['read_tool'])
                checkTools(bob2CapturedPost.context.selectedCapabilities.find(s => s.instance === instanceBob2.id), ['destructive_tool', 'write_tool', 'read_tool', 'openworld_tool'])
                checkTools(bob2CapturedPost.context.selectedCapabilities.find(s => s.instance === instanceChris2.id), ['write_tool', 'read_tool', 'openworld_tool'])

                // --- Chris2 Request ---
                const chris2ChatResponse = await app.inject({
                    method: 'POST',
                    url: '/api/v1/expert/chat',
                    cookies: { sid: chris2Token },
                    headers: { 'x-chat-transaction-id': 'right' },
                    payload: buildChatRequestPayload(chris2, applicationChris2, instanceChris2)
                })

                chris2ChatResponse.statusCode.should.equal(200)

                // analyse capturedPostData to see what MCP features were sent
                const chris2CapturedPost = capturedPosts[chris2.hashid]
                should.exist(chris2CapturedPost)
                chris2CapturedPost.should.have.property('context').which.is.an.Object()
                chris2CapturedPost.context.should.have.property('selectedCapabilities').which.is.an.Array()
                chris2CapturedPost.context.selectedCapabilities.should.have.length(2) // chris2 should have owner access to chris server and viewer access to bob server
                // chris2 should get all tools from chris-instance plus read tool from bob-instance
                checkTools(chris2CapturedPost.context.selectedCapabilities.find(s => s.instance === instanceBob2.id), ['read_tool'])
                checkTools(chris2CapturedPost.context.selectedCapabilities.find(s => s.instance === instanceChris2.id), ['destructive_tool', 'write_tool', 'read_tool', 'openworld_tool'])
            })

            it('should not generate an access token for MCP server when feature teamHttpSecurity is disabled', async function () {
                await setFeatureForTeam(app, 'teamHttpSecurity', false)
                const token = bobToken
                // Stub MCP registration to return 1 online instance
                sinon.stub(instance, 'liveState').returns({ meta: { state: 'running' } })
                sinon.stub(app.db.models.ProjectSettings, 'findOne').callsFake(async (options) => {
                    if (options.where.ProjectId === instance.id && options.where.key === 'settings') {
                        return { value: { httpNodeAuth: { type: 'flowforge-user' } } }
                    }
                    return this.wrappedMethod.apply(this, arguments)
                })

                // sanity checks - instance setting is set
                const projectSettings = await instance.getSetting('settings')
                should.exist(projectSettings)
                projectSettings.should.have.property('httpNodeAuth')
                projectSettings.httpNodeAuth.should.have.property('type', 'flowforge-user')

                // fake the axios post response - capture post data and return resolved promise
                let capturedPostData = null
                sinon.stub(axios, 'post').callsFake((url, data) => {
                    capturedPostData = data
                    return Promise.resolve({
                        data: {
                            transactionId: 'abc',
                            context: { }
                        }
                    })
                })
                const response = await app.inject({
                    method: 'POST',
                    url: '/api/v1/expert/chat',
                    cookies: { sid: token },
                    headers: { 'x-chat-transaction-id': 'abc' },
                    payload: {
                        context: {
                            teamId: team.hashid,
                            query: 'test',
                            selectedCapabilities: [
                                {
                                    team: team.hashid,
                                    application: application.hashid,
                                    instance: instance.id,
                                    instanceType: 'instance',
                                    instanceName: instance.name,
                                    mcpServer: defaultMcpRegistration.hashid,
                                    mcpServerName: 'mcp-server-1',
                                    mcpServerUrl: 'http://instance-url/mcp1',
                                    mcpProtocol: 'http',
                                    prompts: [{}],
                                    resources: [{}],
                                    resourceTemplates: [{}],
                                    tools: [{}],
                                    title: 'the title 1',
                                    version: '1.0.0-beta',
                                    description: 'the description 1'
                                }
                            ]
                        }
                    }
                })
                response.statusCode.should.equal(200)

                // read AccessToken from DB and check it is valid
                const tokens = await app.db.models.AccessToken.findAll({ where: { ownerType: 'http', ownerId: instance.id } })
                tokens.should.be.an.Array()
                tokens.should.have.length(0)

                // Now assert the axios post payload (captured async)
                capturedPostData.should.be.an.Object()
                capturedPostData.context.selectedCapabilities[0].should.have.property('mcpAccessToken').and.be.an.Object()
                capturedPostData.context.selectedCapabilities[0].mcpAccessToken.should.deepEqual({ token: null, scheme: '', scope: ['ff-expert:mcp', 'instance'] })
            })

            it('should not generate an access token for MCP server when instance setting httpNodeAuth is not set', async function () {
                const token = bobToken
                // Stub MCP registration to return 1 online instance
                sinon.stub(instance, 'liveState').returns({ meta: { state: 'running' } })

                // fake the axios post response - capture post data and return resolved promise
                let capturedPostData = null
                sinon.stub(axios, 'post').callsFake((url, data) => {
                    capturedPostData = data
                    return Promise.resolve({
                        data: {
                            transactionId: 'abc',
                            context: { }
                        }
                    })
                })
                const response = await app.inject({
                    method: 'POST',
                    url: '/api/v1/expert/chat',
                    cookies: { sid: token },
                    headers: { 'x-chat-transaction-id': 'abc' },
                    payload: {
                        context: {
                            teamId: team.hashid,
                            query: 'test',
                            selectedCapabilities: [
                                {
                                    team: team.hashid,
                                    application: application.hashid,
                                    instance: instance.id,
                                    instanceType: 'instance',
                                    instanceName: instance.name,
                                    mcpServer: defaultMcpRegistration.hashid,
                                    mcpServerName: 'mcp-server-1',
                                    mcpServerUrl: 'http://instance-url/mcp1',
                                    mcpProtocol: 'http',
                                    prompts: [{}],
                                    resources: [{}],
                                    resourceTemplates: [{}],
                                    tools: [{}],
                                    title: 'the title 1',
                                    version: '1.0.0-beta',
                                    description: 'the description 1'
                                }
                            ]
                        }
                    }
                })
                response.statusCode.should.equal(200)

                // read AccessToken from DB and check it is valid
                const tokens = await app.db.models.AccessToken.findAll({ where: { ownerType: 'http', ownerId: instance.id } })
                tokens.should.be.an.Array()
                tokens.should.have.length(0)

                // Now assert the axios post payload (captured async)
                capturedPostData.should.be.an.Object()
                capturedPostData.context.selectedCapabilities[0].should.have.property('mcpAccessToken').and.be.an.Object()
                capturedPostData.context.selectedCapabilities[0].mcpAccessToken.should.deepEqual({ token: null, scheme: '', scope: ['ff-expert:mcp', 'instance'] })
            })

            it('should generate an access token for MCP server access for an instance when feature teamHttpSecurity is enabled', async function () {
                const token = bobToken
                await setFeatureForTeam(app, 'teamHttpSecurity', true)
                // Stub MCP registration to return 1 online instance
                sinon.stub(instance, 'liveState').returns({ meta: { state: 'running' } })
                sinon.stub(app.db.models.ProjectSettings, 'findOne').callsFake(async (options) => {
                    if (options.where.ProjectId === instance.id && options.where.key === 'settings') {
                        return { value: { httpNodeAuth: { type: 'flowforge-user' } } }
                    }
                    return this.wrappedMethod.apply(this, arguments)
                })

                // fake the axios post response - capture post data and return resolved promise
                let capturedPostData = null
                sinon.stub(axios, 'post').callsFake((url, data) => {
                    capturedPostData = data
                    return Promise.resolve({
                        data: {
                            transactionId: 'abc',
                            context: { }
                        }
                    })
                })
                const response = await app.inject({
                    method: 'POST',
                    url: '/api/v1/expert/chat',
                    cookies: { sid: token },
                    headers: { 'x-chat-transaction-id': 'abc' },
                    payload: {
                        context: {
                            teamId: team.hashid,
                            query: 'test',
                            selectedCapabilities: [
                                {
                                    team: team.hashid,
                                    application: application.hashid,
                                    instance: instance.id,
                                    instanceType: 'instance',
                                    instanceName: instance.name,
                                    mcpServer: defaultMcpRegistration.hashid,
                                    mcpServerName: 'mcp-server-1',
                                    mcpServerUrl: 'http://instance-url/mcp1',
                                    mcpProtocol: 'http',
                                    prompts: [{}],
                                    resources: [{}],
                                    resourceTemplates: [{}],
                                    tools: [{}],
                                    title: 'the title 1',
                                    version: '1.0.0-beta',
                                    description: 'the description 1'
                                }
                            ]
                        }
                    }
                })
                response.statusCode.should.equal(200)

                // read AccessToken from DB and check it is valid
                const tokens = await app.db.models.AccessToken.findAll({ where: { ownerType: 'http', ownerId: instance.id } })
                tokens.should.be.an.Array()
                tokens.should.have.length(1)
                const dbToken = /* get newest token */ tokens.reduce((a, b) => (a.createdAt > b.createdAt ? a : b))
                dbToken.should.have.property('scope').which.is.an.Array().and.have.length(2)
                dbToken.scope.should.containEql('ff-expert:mcp')
                dbToken.scope.should.containEql('instance')
                dbToken.should.have.property('ownerType', 'http')
                dbToken.should.have.property('ownerId', instance.id)
                dbToken.should.have.property('expiresAt').which.is.a.Date()
                const fiveMinsFromNow = Date.now() + (5 * 60 * 1000)
                dbToken.expiresAt.getTime().should.be.approximately(fiveMinsFromNow, 2000) // check expiry (with grace period)

                // get the cached token and check it matches DB token
                const cachedToken = await app.expert.mcp.getCachedToken(instance.id)
                should.exist(cachedToken)
                cachedToken.should.have.property('token').and.be.a.String()
                cachedToken.should.have.property('scheme', 'Bearer')
                cachedToken.should.have.property('scope').which.is.an.Array().and.have.length(2)
                cachedToken.scope.should.containEql('ff-expert:mcp')
                cachedToken.scope.should.containEql('instance')

                // db token should be a hash of the cached token
                const hash = sha256(cachedToken.token)
                hash.should.equal(dbToken.token)

                // Now assert the axios post payload (captured async)
                capturedPostData.should.be.an.Object()
                capturedPostData.context.selectedCapabilities[0].should.have.property('mcpAccessToken').and.be.an.Object()
                capturedPostData.context.selectedCapabilities[0].mcpAccessToken.should.deepEqual({
                    token: cachedToken.token,
                    scheme: 'Bearer',
                    scope: ['ff-expert:mcp', 'instance']
                })
            })

            it('should generate an access token for MCP server access for a device when feature teamHttpSecurity is enabled', async function () {
                const token = bobToken
                await setFeatureForTeam(app, 'teamHttpSecurity', true)

                // register a (trusted) MCP server for the device so the /chat registry re-resolution recognises it
                const deviceRegistration = await app.db.models.MCPRegistration.create({
                    name: 'mcp-device-1',
                    protocol: 'http',
                    targetType: 'device',
                    targetId: '' + device.id,
                    nodeId: 'mcp:node:device-1',
                    endpointRoute: '/mcp',
                    TeamId: team.id
                })

                // a device's httpNodeAuth lives in DeviceSettings under the 'security' key (not ProjectSettings 'settings')
                sinon.stub(app.db.models.DeviceSettings, 'findOne').callsFake(async (options) => {
                    if (options.where.DeviceId === device.id && options.where.key === 'security') {
                        return { value: { httpNodeAuth: { type: 'flowforge-user' } } }
                    }
                    return this.wrappedMethod.apply(this, arguments)
                })

                // fake the axios post response - capture post data and return resolved promise
                let capturedPostData = null
                sinon.stub(axios, 'post').callsFake((url, data) => {
                    capturedPostData = data
                    return Promise.resolve({
                        data: {
                            transactionId: 'abc',
                            context: { }
                        }
                    })
                })
                const response = await app.inject({
                    method: 'POST',
                    url: '/api/v1/expert/chat',
                    cookies: { sid: token },
                    headers: { 'x-chat-transaction-id': 'abc' },
                    payload: {
                        context: {
                            teamId: team.hashid,
                            query: 'test',
                            selectedCapabilities: [
                                {
                                    team: team.hashid,
                                    application: application.hashid,
                                    instance: device.hashid, // device hashid - re-resolved against the trusted registry
                                    instanceType: 'device',
                                    instanceName: device.name,
                                    mcpServer: deviceRegistration.hashid,
                                    mcpServerName: 'mcp-device-1',
                                    mcpServerUrl: 'http://device-url/mcp',
                                    mcpProtocol: 'http',
                                    prompts: [{}],
                                    resources: [{}],
                                    resourceTemplates: [{}],
                                    tools: [{}],
                                    title: 'the device title',
                                    version: '1.0.0-beta',
                                    description: 'the device description'
                                }
                            ]
                        }
                    }
                })
                response.statusCode.should.equal(200)

                // read AccessToken from DB and check it is valid - a device token has ownerType 'http:device'
                const tokens = await app.db.models.AccessToken.findAll({ where: { ownerType: 'http:device', ownerId: '' + device.id } })
                tokens.should.be.an.Array()
                tokens.should.have.length(1)
                const dbToken = /* get newest token */ tokens.reduce((a, b) => (a.createdAt > b.createdAt ? a : b))
                dbToken.should.have.property('scope').which.is.an.Array().and.have.length(2)
                dbToken.scope.should.containEql('ff-expert:mcp')
                dbToken.scope.should.containEql('device')
                dbToken.should.have.property('ownerType', 'http:device')
                dbToken.should.have.property('ownerId', '' + device.id)
                dbToken.should.have.property('expiresAt').which.is.a.Date()
                const fiveMinsFromNow = Date.now() + (5 * 60 * 1000)
                dbToken.expiresAt.getTime().should.be.approximately(fiveMinsFromNow, 2000) // check expiry (with grace period)

                // get the cached token and check it matches DB token (cache is keyed by the device id)
                const cachedToken = await app.expert.mcp.getCachedToken(device.id)
                should.exist(cachedToken)
                cachedToken.should.have.property('token').and.be.a.String()
                cachedToken.should.have.property('scheme', 'Bearer')
                cachedToken.should.have.property('scope').which.is.an.Array().and.have.length(2)
                cachedToken.scope.should.containEql('ff-expert:mcp')
                cachedToken.scope.should.containEql('device')

                // db token should be a hash of the cached token
                const hash = sha256(cachedToken.token)
                hash.should.equal(dbToken.token)

                // Now assert the axios post payload (captured async)
                capturedPostData.should.be.an.Object()
                capturedPostData.context.selectedCapabilities[0].should.have.property('mcpAccessToken').and.be.an.Object()
                capturedPostData.context.selectedCapabilities[0].mcpAccessToken.should.deepEqual({
                    token: cachedToken.token,
                    scheme: 'Bearer',
                    scope: ['ff-expert:mcp', 'device']
                })
            })

            it('should NOT attach a cached token when the claimed application does not own the selected instance', async function () {
                // A cached MCP token must not be attached unless the selected instance genuinely belongs to the claimed application
                const token = bobToken // bob is a team owner (so passes the claimed-application permission check)
                await setFeatureForTeam(app, 'teamHttpSecurity', true)

                // Create a "victim" application + instance in the SAME team but a DIFFERENT application
                // than the one the attacker will claim access to.
                const victimApplication = await app.factory.createApplication({ name: 'application-chris' }, team)
                const victimInstance = await app.factory.createInstance(
                    { name: 'chris2-instance' },
                    victimApplication,
                    app.stack,
                    app.template,
                    app.projectType,
                    { start: false }
                )

                // Register the victim instance's MCP server (under the attacker-chosen name) so the
                // capability survives the trusted-registry re-resolution and the test specifically
                // exercises the instance/application OWNERSHIP check rather than the registry-miss path.
                const victimRegistration = await createMcpRegistration(app, victimInstance, { name: 'attacker-controlled' })

                // The victim instance uses FlowFuse http auth, so a real Bearer token would be minted/cached
                sinon.stub(app.db.models.ProjectSettings, 'findOne').callsFake(async (options) => {
                    if (options.where.ProjectId === victimInstance.id && options.where.key === 'settings') {
                        return { value: { httpNodeAuth: { type: 'flowforge-user' } } }
                    }
                    return this.wrappedMethod.apply(this, arguments)
                })

                // Pre-populate the token cache for the victim instance (simulates a legitimate prior use)
                const victimToken = await app.expert.mcp.getOrCreateToken(victimInstance, 'instance', victimInstance.id, true)
                should.exist(victimToken)
                should.exist(await app.expert.mcp.getCachedToken(victimInstance.id)) // confirm it is cached

                // capture what gets forwarded to the expert backend
                let capturedPostData = null
                sinon.stub(axios, 'post').callsFake((url, data) => {
                    capturedPostData = data
                    return Promise.resolve({ data: { transactionId: 'abc', context: {} } })
                })

                // Attacker claims the application they DO have access to (`application`), but references
                // the victim instance (which belongs to `victimApplication`).
                const response = await app.inject({
                    method: 'POST',
                    url: '/api/v1/expert/chat',
                    cookies: { sid: token },
                    headers: { 'x-chat-transaction-id': 'abc' },
                    payload: {
                        context: {
                            teamId: team.hashid,
                            query: 'use the selected MCP resource',
                            selectedCapabilities: [
                                {
                                    team: team.hashid,
                                    application: application.hashid, // claimed application (attacker has access)
                                    instance: victimInstance.id, // victim instance (belongs to a different application)
                                    instanceType: 'instance',
                                    instanceName: 'target-instance',
                                    mcpServer: victimRegistration.hashid, // resolves in the trusted registry, but fails the ownership check
                                    mcpServerName: 'attacker-controlled',
                                    mcpServerUrl: 'https://attacker.example/mcp',
                                    mcpProtocol: 'http',
                                    prompts: [],
                                    resources: [{ name: 'leak', uri: 'resource://leak' }],
                                    resourceTemplates: [],
                                    tools: []
                                }
                            ]
                        }
                    }
                })
                response.statusCode.should.equal(200)

                // The mismatched capability must be dropped entirely - no cached token leaked downstream
                capturedPostData.should.be.an.Object()
                should(capturedPostData.context.selectedCapabilities).be.undefined()

                await app.db.models.Project.destroy({ where: { id: victimInstance.id } })
                await app.db.models.Application.destroy({ where: { id: victimApplication.id } })
            })

            it('should overwrite client-supplied transport fields with trusted registry values', async function () {
                const token = bobToken // team owner

                let capturedPostData = null
                sinon.stub(axios, 'post').callsFake((url, data) => {
                    capturedPostData = data
                    return Promise.resolve({ data: { transactionId: 'abc', context: {} } })
                })

                const response = await app.inject({
                    method: 'POST',
                    url: '/api/v1/expert/chat',
                    cookies: { sid: token },
                    headers: { 'x-chat-transaction-id': 'abc' },
                    payload: {
                        context: {
                            teamId: team.hashid,
                            query: 'use the selected MCP resource',
                            selectedCapabilities: [
                                {
                                    team: team.hashid,
                                    application: application.hashid,
                                    instance: instance.id,
                                    instanceType: 'instance',
                                    instanceName: 'spoofed-name',
                                    mcpServer: defaultMcpRegistration.hashid, // matches the registration created in beforeEach
                                    mcpServerName: 'mcp-server-1',
                                    mcpServerUrl: 'https://attacker.example/mcp', // client provided - must be dropped
                                    instanceUrl: 'https://attacker.example', // client provided - must be overwritten
                                    mcpEndpoint: '/evil', // client provided - must be overwritten
                                    mcpProtocol: 'sse', // client provided - must be overwritten
                                    prompts: [],
                                    resources: [{ name: 'res', uri: 'resource://res' }],
                                    resourceTemplates: [],
                                    tools: []
                                }
                            ]
                        }
                    }
                })
                response.statusCode.should.equal(200)

                capturedPostData.should.be.an.Object()
                const forwarded = capturedPostData.context.selectedCapabilities
                forwarded.should.be.an.Array().and.have.length(1)
                // the client-supplied URL must never be forwarded; the agent rebuilds it from trusted parts
                forwarded[0].should.not.have.property('mcpServerUrl')
                // transport/identity fields re-resolved from the trusted registry + instance
                forwarded[0].should.have.property('instanceUrl', instance.url)
                forwarded[0].should.have.property('mcpEndpoint', '/mcp1')
                forwarded[0].should.have.property('mcpProtocol', 'http')
                forwarded[0].should.have.property('mcpServerName', 'mcp-server-1')
                forwarded[0].should.have.property('instanceName', instance.name)
                forwarded[0].should.have.property('team', team.hashid)
                forwarded[0].should.have.property('application', application.hashid)
                // mcpServer is re-resolved to (and forwarded as) the trusted registration hashid
                forwarded[0].should.have.property('mcpServer', defaultMcpRegistration.hashid)
            })

            it('should clear cached MCP server access token when project setting httpNodeAuth is changed', async function () {
                const token = bobToken
                // mock get setting to return httpNodeAuth with flowforge-user
                sinon.stub(app.db.models.ProjectSettings, 'findOne').callsFake(async (options) => {
                    if (options.where.ProjectId === instance.id && options.where.key === 'settings') {
                        return { value: { httpNodeAuth: { type: 'flowforge-user' } } }
                    }
                    return this.wrappedMethod.apply(this, arguments)
                })
                await app.expert.mcp.getOrCreateToken(instance, 'instance', instance.id, true) // creates and caches a token
                const cachedToken1 = await app.expert.mcp.getCachedToken(instance.id)
                should.exist(cachedToken1)

                // change the instance setting httpNodeAuth via API to invalidate the cached token
                const response2 = await app.inject({
                    method: 'PUT',
                    url: '/api/v1/projects/' + instance.id,
                    cookies: { sid: token },
                    payload: {
                        settings: {
                            httpNodeAuth: { type: 'basic', user: 'newUser', pass: 'newPass' }
                        }
                    }
                })
                response2.statusCode.should.equal(200)

                // now cached token should be cleared
                const cachedToken2 = await app.expert.mcp.getCachedToken(instance.id)
                should.not.exist(cachedToken2)
            })
        })

        describe('MCP features Endpoint', function () {
            let mockMcpRegistration1
            beforeEach(async function () {
                await setFeatureForTeam(app, 'teamHttpSecurity', true)
                // The MCP features endpoint now gates on the instance launcher version - the default
                // instance must advertise a launcher new enough to support MCP features.
                instance.versions = { launcher: { current: '2.32.0' } }
                // create an common reusable MCP registration
                mockMcpRegistration1 = {
                    id: 1,
                    hashid: 'mcpreg00001',
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

                }
            })

            // Stub app.containers.getMCPFeatures to behave like the launcher admin API: echo each
            // requested server spec back (the spec carries ownership/transport details + the minted
            // mcpAccessToken) and attach the supplied MCP feature set. Returns a handle whose
            // `mcpServers` field captures the specs the route passed in (one entry per registration).
            function stubGetMCPFeatures (features = { prompts: [{}], resources: [{}], resourceTemplates: [{}], tools: [{}] }) {
                const captured = { mcpServers: null, calls: [] }
                sinon.stub(app.containers, 'getMCPFeatures').callsFake(async (inst, mcpServers) => {
                    captured.mcpServers = mcpServers
                    captured.calls.push({ instance: inst, mcpServers })
                    return mcpServers.map(spec => ({ spec, features: typeof features === 'function' ? features(spec) : features }))
                })
                return captured
            }

            it('should return 401 for instance token', async function () {
                const token = instanceToken
                const response = await app.inject({
                    method: 'POST',
                    url: '/api/v1/expert/mcp/features',
                    cookies: { sid: token },
                    payload: { context: { teamId: 'not-a-team' }, query: 'test' },
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
                    payload: { context: { teamId: 'not-a-team' }, query: 'test' },
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
                    payload: { context: { teamId: team.hashid } },
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
                const getFeatures = sinon.stub(app.containers, 'getMCPFeatures') // should not be called
                const response = await app.inject({
                    method: 'POST',
                    url: '/api/v1/expert/mcp/features',
                    cookies: { sid: token },
                    payload: { context: { teamId: team.hashid } },
                    headers: { 'x-chat-transaction-id': 'abc' }
                })
                response.statusCode.should.equal(200)
                const json = response.json()
                json.should.deepEqual({ servers: [], incompatibleServers: [], transactionId: 'abc' })
                getFeatures.called.should.be.false()
            })

            it('should get mcp features for team member', async function () {
                const token = bobToken
                // Stub 3 MCP registrations: 1 online, 1 offline, 1 other-team-online
                // It should only send results for the online instances that belong to the correct team
                sinon.stub(app.db.models.MCPRegistration, 'byTeam').resolves([
                    {
                        id: 1,
                        hashid: 'mcpreg00001',
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
                            ApplicationId: application.id,
                            state: '',
                            liveState: () => ({ meta: { state: 'suspended' } }),
                            getSetting: sinon.stub().resolves({}) // no special settings
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
                            ApplicationId: application.id,
                            state: 'running',
                            liveState: () => ({ meta: { state: 'running' } }),
                            getSetting: sinon.stub().resolves({}) // no special settings
                        },
                        title: 'the title 3',
                        version: '3.0.0-beta',
                        description: 'the description 3'
                    }, {
                        id: 4, // should be excluded due to being old launcher version
                        name: 'mcp-server-4',
                        protocol: 'http',
                        targetType: 'instance',
                        targetId: 'acbd-1234',
                        nodeId: 'mcp:node:1',
                        endpointRoute: '/mcp2',
                        TeamId: team.id,
                        Project: {
                            id: 'dddd4444',
                            name: 'old-instance',
                            ApplicationId: application.id,
                            state: 'running',
                            liveState: () => ({ meta: { state: 'running' } }),
                            getSetting: sinon.stub().resolves({}), // no special settings
                            versions: { launcher: { current: '2.0.0' } } // old launcher version
                        },
                        title: 'the title 4',
                        version: '4.0.0-beta',
                        description: 'the description 4'
                    }
                ])
                // fake online status by stubbing liveState
                sinon.stub(instance, 'liveState').returns({ meta: { state: 'running' } })

                // the launcher (via app.containers.getMCPFeatures) returns the MCP features per instance
                const captured = stubGetMCPFeatures()
                const response = await app.inject({
                    method: 'POST',
                    url: '/api/v1/expert/mcp/features',
                    cookies: { sid: token },
                    headers: { 'x-chat-transaction-id': 'abc' },
                    payload: { context: { teamId: team.hashid } }
                })
                response.statusCode.should.equal(200)

                // only the single online, correct-team instance should have been queried
                app.containers.getMCPFeatures.calledOnce.should.be.true()
                // check the per-server spec passed to the launcher was correct
                captured.mcpServers.should.be.an.Array().and.has.length(1)
                const reg = captured.mcpServers[0]
                reg.should.have.property('team', team.hashid)
                reg.should.have.property('application', application.hashid)
                reg.should.have.property('instance', instance.id)
                reg.should.have.property('instanceType', 'instance')
                reg.should.have.property('instanceName', instance.name)
                reg.should.have.property('instanceUrl', instance.url)
                reg.should.have.property('mcpServer', 'mcpreg00001')
                reg.should.have.property('mcpServerName', 'mcp-server-1')
                reg.should.have.property('mcpEndpoint', '/mcp1')
                reg.should.have.property('mcpProtocol', 'http')
                reg.should.have.property('mcpAccessToken')
                reg.should.have.property('title', 'the title 1')
                reg.should.have.property('version', '1.0.0-beta')
                reg.should.have.property('description', 'the description 1')

                // check the response from our API
                const result = response.json()
                result.should.have.property('transactionId', 'abc')
                result.should.have.property('servers').which.is.an.Array().and.has.length(1)
                result.servers[0].should.only.have.keys('team', 'application', 'instance', 'instanceType', 'instanceName', 'mcpServer', 'mcpServerName', 'prompts', 'resources', 'resourceTemplates', 'tools', 'title', 'version', 'description')
                result.servers[0].should.have.property('team', team.hashid)
                result.servers[0].should.have.property('application', application.hashid)
                result.servers[0].should.have.property('instance', instance.id)
                result.servers[0].should.have.property('instanceType', 'instance')
                result.servers[0].should.have.property('instanceName', instance.name)
                result.servers[0].should.have.property('mcpServer', 'mcpreg00001')
                result.servers[0].should.have.property('mcpServerName', 'mcp-server-1')
                result.servers[0].should.have.property('title', 'the title 1')
                result.servers[0].should.have.property('version', '1.0.0-beta')
                result.servers[0].should.have.property('description', 'the description 1')
                // should not contain the transport fields (instanceUrl, mcpEndpoint, mcpProtocol) since those are not needed by the expert backend
                result.should.not.have.property('instanceUrl')
                result.should.not.have.property('mcpEndpoint')
                result.should.not.have.property('mcpProtocol')
            })

            it('should report instances whose launcher version is too old as incompatible', async function () {
                const token = bobToken
                // a single registration whose instance launcher is older than the minimum supported version
                sinon.stub(app.db.models.MCPRegistration, 'byTeam').resolves([{
                    id: 1,
                    hashid: 'mcpreg00001',
                    name: 'mcp-server-1',
                    protocol: 'http',
                    targetType: 'instance',
                    targetId: instance.id,
                    nodeId: 'mcp:node:1',
                    endpointRoute: '/mcp1',
                    TeamId: team.id,
                    Project: instance
                }])
                // launcher version below MIN_HOSTED_INSTANCE_LAUNCHER_VERSION (2.32.0)
                instance.versions = { launcher: { current: '2.0.0' } }
                const liveState = sinon.stub(instance, 'liveState').returns({ meta: { state: 'running' } })
                const getFeatures = sinon.stub(app.containers, 'getMCPFeatures')

                const response = await app.inject({
                    method: 'POST',
                    url: '/api/v1/expert/mcp/features',
                    cookies: { sid: token },
                    headers: { 'x-chat-transaction-id': 'abc' },
                    payload: { context: { teamId: team.hashid } }
                })
                response.statusCode.should.equal(200)

                const result = response.json()
                result.should.have.property('servers').which.is.an.Array().and.has.length(0)
                result.should.have.property('incompatibleServers').which.is.an.Array().and.has.length(1)
                result.incompatibleServers[0].should.have.property('instance', instance.id)
                result.incompatibleServers[0].should.have.property('instanceType', 'instance')
                result.incompatibleServers[0].should.have.property('currentVersion', '2.0.0')
                result.incompatibleServers[0].should.have.property('minimumSupportedVersion', '2.32.0')
                // an incompatible instance must never be queried for features (or have its live state checked past the version gate)
                getFeatures.called.should.be.false()
                liveState.called.should.be.false()
            })

            it('should only get permitted mcp features when granular RBACs is enabled', async function () {
                // PREMISE: 3 applications (appAlice2, appBob2, appChris), 3 users (userAlice2, userBob2, userChris2), 1 team
                // - Each application has mcp tool "destructive_tool", "write_tool", "read_tool", "openworld_tool"
                // - each user is an owner of same named application (userAlice2 owns appAlice2, etc)
                // - Alice2 is a owner of appBob2 and downgraded to be a member of appChris2
                // - Bob2 is downgraded to member of appChris2 and viewer to appAlice2
                // - Chris2 is upgraded to owner of appChris2 and a downgraded to viewer to appBob2 (has no access to appAlice2)
                // EXPECTATION:
                // - when Alice2 requests MCP features, she should get all features in appBob2 plus any non-destructive features from appChris2
                // - when Bob2 requests MCP features, he should get all features in appBob2 plus write and openworld features from appChris2 and read features from appAlice2
                // - when Chris2 requests MCP features, he should only features from appChris2 plus read features from appBob2 (nothing from appAlice2)

                // create 3 applications
                const applicationAlice2 = await app.factory.createApplication({ name: 'application-alice' }, team)
                const applicationBob2 = await app.factory.createApplication({ name: 'application-bob' }, team)
                const applicationChris2 = await app.factory.createApplication({ name: 'application-chris' }, team)

                // create users
                const alice2 = await await app.db.models.User.create({ username: 'alice2', name: 'Alice Two', email: 'alice2@example.com', email_verified: true, password: 'aaPassword' })
                const bob2 = await app.db.models.User.create({ username: 'bob2', name: 'Bob Two', email: 'bob2@example.com', email_verified: true, password: 'bbPassword' })
                const chris2 = await app.db.models.User.create({ username: 'chris2', name: 'Chris Two', email: 'chris2@example.com', email_verified: true, password: 'ccPassword' })

                // set alice2 as an owner of ATeam
                await team.addUser(alice2, { through: { role: Roles.Owner } })
                // set bob as an owner of ATeam
                await team.addUser(bob2, { through: { role: Roles.Owner } })
                // set chris as a member of ATeam
                await team.addUser(chris2, { through: { role: Roles.Member } })

                const alice2Token = await login(app, 'alice2', 'aaPassword')
                const bob2Token = await login(app, 'bob2', 'bbPassword')
                const chris2Token = await login(app, 'chris2', 'ccPassword')

                const alice2TeamMembership = await app.db.models.TeamMember.findOne({ where: { TeamId: team.id, UserId: alice2.id } })
                alice2TeamMembership.permissions = {
                    applications: { [applicationAlice2.hashid]: Roles.Owner, [applicationBob2.hashid]: Roles.Owner, [applicationChris2.hashid]: Roles.Member }
                }
                await alice2TeamMembership.save()

                const bob2TeamMembership = await app.db.models.TeamMember.findOne({ where: { TeamId: team.id, UserId: bob2.id } })
                bob2TeamMembership.permissions = {
                    applications: { [applicationAlice2.hashid]: Roles.Viewer, [applicationBob2.hashid]: Roles.Owner, [applicationChris2.hashid]: Roles.Member }
                }
                await bob2TeamMembership.save()

                const chris2TeamMembership = await app.db.models.TeamMember.findOne({ where: { TeamId: team.id, UserId: chris2.id } })
                chris2TeamMembership.permissions = {
                    applications: { [applicationAlice2.hashid]: Roles.None, [applicationBob2.hashid]: Roles.Viewer, [applicationChris2.hashid]: Roles.Owner }
                }
                await chris2TeamMembership.save()

                // Stub MCP registration table data to return the 3 application instances MCP servers
                sinon.stub(app.db.models.MCPRegistration, 'byTeam').resolves([
                    {
                        id: 1,
                        hashid: 'mcpreg-alice',
                        name: 'mcp-server-alice',
                        protocol: 'http',
                        targetType: 'instance',
                        targetId: 'alice',
                        nodeId: 'mcp:node:1',
                        endpointRoute: '/mcp',
                        TeamId: team.id,
                        Project: {
                            id: 'alice',
                            name: 'alice',
                            state: 'running',
                            ApplicationId: applicationAlice2.id,
                            versions: { launcher: { current: '2.32.0' } },
                            liveState: () => ({ meta: { state: 'running' } }),
                            getSetting: sinon.stub().resolves({}) // no special settings
                        },
                        title: 'Alices MCP Server',
                        version: '1.0.0-beta',
                        description: 'Alices MCP Server'

                    }, {
                        id: 2,
                        hashid: 'mcpreg-bob',
                        name: 'mcp-server-bob',
                        protocol: 'http',
                        targetType: 'instance',
                        targetId: 'bob',
                        nodeId: 'mcp:node:1',
                        endpointRoute: '/mcp',
                        TeamId: team.id,
                        Project: {
                            id: 'bob',
                            name: 'bob',
                            state: 'running',
                            ApplicationId: applicationBob2.id,
                            versions: { launcher: { current: '2.32.0' } },
                            liveState: () => ({ meta: { state: 'running' } }),
                            getSetting: sinon.stub().resolves({}) // no special settings
                        },
                        title: 'Bobs MCP Server',
                        version: '2.0.0-beta',
                        description: 'Bobs MCP Server'

                    }, {
                        id: 3,
                        hashid: 'mcpreg-chris',
                        name: 'mcp-server-chris',
                        protocol: 'http',
                        targetType: 'instance',
                        targetId: 'chris',
                        nodeId: 'mcp:node:1',
                        endpointRoute: '/mcp',
                        TeamId: team.id,
                        Project: {
                            id: 'chris',
                            name: 'chris',
                            state: 'running',
                            ApplicationId: applicationChris2.id,
                            versions: { launcher: { current: '2.32.0' } },
                            liveState: () => ({ meta: { state: 'running' } }),
                            getSetting: sinon.stub().resolves({}) // no special settings
                        },
                        title: 'Chris MCP Server',
                        version: '3.0.0-beta',
                        description: 'Chris MCP Server'
                    }
                ])

                // every instance's MCP server advertises the same four tools; the route applies
                // per-application RBAC filtering to each based on the requesting user's permissions
                const toolSet = [
                    {
                        name: 'destructive_tool',
                        annotations: {
                            destructiveHint: true,
                            readOnlyHint: false,
                            openWorldHint: false,
                            idempotentHint: false
                        }
                    },
                    {
                        name: 'write_tool',
                        annotations: {
                            destructiveHint: false,
                            readOnlyHint: false,
                            openWorldHint: false,
                            idempotentHint: false
                        }
                    },
                    {
                        name: 'read_tool',
                        annotations: {
                            destructiveHint: false,
                            readOnlyHint: true,
                            openWorldHint: false,
                            idempotentHint: false
                        }
                    },
                    {
                        name: 'openworld_tool',
                        description: 'An openworld tool',
                        type: 'tool',
                        annotations: {
                            destructiveHint: false,
                            readOnlyHint: false,
                            openWorldHint: true,
                            idempotentHint: false
                        }
                    }
                ]

                // Stub the launcher feature fetch to return the toolset for every requested server
                stubGetMCPFeatures({ prompts: [], resources: [], resourceTemplates: [], tools: toolSet })

                // Helper function to check that the returned tools match expected tool names
                const checkTools = (serverResult, expectedToolNames) => {
                    const toolNames = serverResult.tools.map(t => t.name)
                    toolNames.should.have.length(expectedToolNames.length)
                    expectedToolNames.forEach(name => {
                        toolNames.should.containEql(name)
                    })
                }

                // --- Alice2 Request ---
                const alice2Response = await app.inject({
                    method: 'POST',
                    url: '/api/v1/expert/mcp/features',
                    cookies: { sid: alice2Token },
                    headers: { 'x-chat-transaction-id': 'right' },
                    payload: { context: { teamId: team.hashid } }
                })
                alice2Response.statusCode.should.equal(200)
                const alice2Results = alice2Response.json()
                alice2Results.servers.should.be.an.Array()
                alice2Results.servers.should.have.length(3) // alice2 has access to all 3 servers
                // alice2 should get all tools from bob-instance plus non-destructive tools from chris-instance
                checkTools(alice2Results.servers.find(s => s.instance === 'alice'), ['destructive_tool', 'write_tool', 'read_tool', 'openworld_tool'])
                checkTools(alice2Results.servers.find(s => s.instance === 'bob'), ['destructive_tool', 'write_tool', 'read_tool', 'openworld_tool'])
                checkTools(alice2Results.servers.find(s => s.instance === 'chris'), ['write_tool', 'read_tool', 'openworld_tool'])

                // --- Bob2 Request ---
                const bob2Response = await app.inject({
                    method: 'POST',
                    url: '/api/v1/expert/mcp/features',
                    cookies: { sid: bob2Token },
                    headers: { 'x-chat-transaction-id': 'right' },
                    payload: { context: { teamId: team.hashid } }
                })
                bob2Response.statusCode.should.equal(200)
                const bob2Result = bob2Response.json()
                bob2Result.servers.should.be.an.Array()
                bob2Result.servers.should.have.length(3) // bob2 has access to all 3 servers
                // bob2 should get all tools from bob-instance plus write/openworld tools from chris-instance plus read tool from alice-instance
                checkTools(bob2Result.servers.find(s => s.instance === 'alice'), ['read_tool'])
                checkTools(bob2Result.servers.find(s => s.instance === 'bob'), ['destructive_tool', 'write_tool', 'read_tool', 'openworld_tool'])
                checkTools(bob2Result.servers.find(s => s.instance === 'chris'), ['write_tool', 'read_tool', 'openworld_tool'])

                // --- Chris2 Request ---
                const chris2Response = await app.inject({
                    method: 'POST',
                    url: '/api/v1/expert/mcp/features',
                    cookies: { sid: chris2Token },
                    headers: { 'x-chat-transaction-id': 'right' },
                    payload: { context: { teamId: team.hashid } }
                })
                chris2Response.statusCode.should.equal(200)
                const chris2Result = chris2Response.json()
                chris2Result.servers.should.be.an.Array()
                chris2Result.servers.should.have.length(2) // chris2 should have owner access to chris server and viewer access to bob server
                // chris2 should get all tools from chris-instance plus read tool from bob-instance
                checkTools(chris2Result.servers.find(s => s.instance === 'bob'), ['read_tool'])
                checkTools(chris2Result.servers.find(s => s.instance === 'chris'), ['destructive_tool', 'write_tool', 'read_tool', 'openworld_tool'])
            })

            it('should not generate an access token for MCP server when feature teamHttpSecurity is disabled', async function () {
                await setFeatureForTeam(app, 'teamHttpSecurity', false)
                const token = bobToken
                // Stub MCP registration to return 1 online instance
                sinon.stub(app.db.models.MCPRegistration, 'byTeam').resolves([mockMcpRegistration1])
                sinon.stub(instance, 'liveState').returns({ meta: { state: 'running' } })
                sinon.stub(instance, 'getSetting').resolves({ httpNodeAuth: { type: 'flowforge-user' } })

                // capture the per-server specs the route hands to the launcher feature fetch
                const captured = stubGetMCPFeatures()
                const response = await app.inject({
                    method: 'POST',
                    url: '/api/v1/expert/mcp/features',
                    cookies: { sid: token },
                    headers: { 'x-chat-transaction-id': 'abc' },
                    payload: { context: { teamId: team.hashid } }
                })
                response.statusCode.should.equal(200)

                // read AccessToken from DB and check it is valid
                const tokens = await app.db.models.AccessToken.findAll({ where: { ownerType: 'http', ownerId: instance.id } })
                tokens.should.be.an.Array()
                tokens.should.have.length(0)

                // Now assert the per-server spec passed to the launcher feature fetch
                captured.mcpServers.should.be.an.Array().and.have.length(1)
                captured.mcpServers[0].should.have.property('mcpAccessToken').and.be.an.Object()
                captured.mcpServers[0].mcpAccessToken.should.deepEqual({ token: null, scheme: '', scope: ['ff-expert:mcp', 'instance'] })
            })

            it('should not generate an access token for MCP server when instance setting httpNodeAuth is not set', async function () {
                await setFeatureForTeam(app, 'teamHttpSecurity', true)
                const token = bobToken
                // Stub MCP registration to return 1 online instance
                sinon.stub(app.db.models.MCPRegistration, 'byTeam').resolves([mockMcpRegistration1])
                sinon.stub(instance, 'liveState').returns({ meta: { state: 'running' } })
                sinon.stub(instance, 'getSetting').resolves({}) // no httpNodeAuth settings
                // capture the per-server specs the route hands to the launcher feature fetch
                const captured = stubGetMCPFeatures()
                const response = await app.inject({
                    method: 'POST',
                    url: '/api/v1/expert/mcp/features',
                    cookies: { sid: token },
                    headers: { 'x-chat-transaction-id': 'abc' },
                    payload: { context: { teamId: team.hashid } }
                })
                response.statusCode.should.equal(200)

                // should not have created any access tokens
                const tokens = await app.db.models.AccessToken.findAll({ where: { ownerType: 'http', ownerId: instance.id } })
                tokens.should.be.an.Array()
                tokens.should.have.length(0)
                // Now assert the per-server spec passed to the launcher feature fetch
                captured.mcpServers.should.be.an.Array().and.have.length(1)
                captured.mcpServers[0].should.have.property('mcpAccessToken').and.be.an.Object()
                captured.mcpServers[0].mcpAccessToken.should.deepEqual({ token: null, scheme: '', scope: ['ff-expert:mcp', 'instance'] })
            })

            it('should generate an access token for MCP server access when feature teamHttpSecurity is enabled', async function () {
                const token = bobToken
                // Stub MCP registration to return 1 online instance
                sinon.stub(app.db.models.MCPRegistration, 'byTeam').resolves([mockMcpRegistration1])
                sinon.stub(instance, 'liveState').returns({ meta: { state: 'running' } })
                sinon.stub(instance, 'getSetting').resolves({ httpNodeAuth: { type: 'flowforge-user' } })

                // capture the per-server specs the route hands to the launcher feature fetch
                const captured = stubGetMCPFeatures()
                const response = await app.inject({
                    method: 'POST',
                    url: '/api/v1/expert/mcp/features',
                    cookies: { sid: token },
                    headers: { 'x-chat-transaction-id': 'abc' },
                    payload: { context: { teamId: team.hashid } }
                })
                response.statusCode.should.equal(200)

                // read AccessToken from DB and check it is valid
                const tokens = await app.db.models.AccessToken.findAll({ where: { ownerType: 'http', ownerId: instance.id } })
                tokens.should.be.an.Array()
                tokens.should.have.length(1)
                const dbToken = /* get newest token */ tokens.reduce((a, b) => (a.createdAt > b.createdAt ? a : b))
                dbToken.should.have.property('scope').which.is.an.Array().and.have.length(2)
                dbToken.scope.should.containEql('ff-expert:mcp')
                dbToken.scope.should.containEql('instance')
                dbToken.should.have.property('ownerType', 'http')
                dbToken.should.have.property('ownerId', instance.id)
                dbToken.should.have.property('expiresAt').which.is.a.Date()
                const fiveMinsFromNow = Date.now() + (5 * 60 * 1000)
                dbToken.expiresAt.getTime().should.be.approximately(fiveMinsFromNow, 2000) // check expiry (with grace period)

                // get the cached token and check it matches DB token
                const cachedToken = await app.expert.mcp.getCachedToken(instance.id)
                should.exist(cachedToken)
                cachedToken.should.have.property('token').and.be.a.String()
                cachedToken.should.have.property('scheme', 'Bearer')
                cachedToken.should.have.property('scope').which.is.an.Array().and.have.length(2)
                cachedToken.scope.should.containEql('ff-expert:mcp')
                cachedToken.scope.should.containEql('instance')

                // db token should be a hash of the cached token
                const hash = sha256(cachedToken.token)
                hash.should.equal(dbToken.token)

                // Now assert the per-server spec passed to the launcher feature fetch
                captured.mcpServers.should.be.an.Array().and.have.length(1)
                captured.mcpServers[0].should.have.property('mcpAccessToken').and.be.an.Object()
                captured.mcpServers[0].mcpAccessToken.should.deepEqual({
                    token: cachedToken.token,
                    scheme: 'Bearer',
                    scope: ['ff-expert:mcp', 'instance']
                })
            })

            it('should get MCP server access token from cache', async function () {
                const token = bobToken
                // Stub MCP registration to return 1 online instance
                sinon.stub(app.db.models.MCPRegistration, 'byTeam').resolves([mockMcpRegistration1])
                sinon.stub(instance, 'liveState').returns({ meta: { state: 'running' } })
                sinon.stub(instance, 'getSetting').resolves({ httpNodeAuth: { type: 'flowforge-user' } })
                const createHTTPNodeTokenSpy = sinon.spy(app.db.controllers.AccessToken, 'createHTTPNodeToken')

                // stub the launcher feature fetch - the minted access token is included in the spec it receives
                stubGetMCPFeatures()
                const response1 = await app.inject({
                    method: 'POST',
                    url: '/api/v1/expert/mcp/features',
                    cookies: { sid: token },
                    headers: { 'x-chat-transaction-id': 'abc' },
                    payload: { context: { teamId: team.hashid } }
                })
                response1.statusCode.should.equal(200)

                createHTTPNodeTokenSpy.calledOnce.should.be.true()

                const response2 = await app.inject({
                    method: 'POST',
                    url: '/api/v1/expert/mcp/features',
                    cookies: { sid: token },
                    headers: { 'x-chat-transaction-id': 'abc' },
                    payload: { context: { teamId: team.hashid } }
                })
                response2.statusCode.should.equal(200)

                createHTTPNodeTokenSpy.calledOnce.should.be.true() // should still be called only once
            })

            it('should clear cached MCP server access token when project setting httpNodeAuth is changed', async function () {
                const token = bobToken
                // mock get setting to return httpNodeAuth with flowforge-user
                sinon.stub(app.db.models.ProjectSettings, 'findOne').callsFake(async (options) => {
                    if (options.where.ProjectId === instance.id && options.where.key === 'settings') {
                        return { value: { httpNodeAuth: { type: 'flowforge-user' } } }
                    }
                    return this.wrappedMethod.apply(this, arguments)
                })
                await app.expert.mcp.getOrCreateToken(instance, 'instance', instance.id, true) // creates and caches a token
                const cachedToken1 = await app.expert.mcp.getCachedToken(instance.id)
                should.exist(cachedToken1)

                // change the instance setting httpNodeAuth via API to invalidate the cached token
                const response2 = await app.inject({
                    method: 'PUT',
                    url: '/api/v1/projects/' + instance.id,
                    cookies: { sid: token },
                    payload: {
                        settings: {
                            httpNodeAuth: { type: 'basic', user: 'newUser', pass: 'newPass' }
                        }
                    }
                })
                response2.statusCode.should.equal(200)

                // now cached token should be cleared
                const cachedToken2 = await app.expert.mcp.getCachedToken(instance.id)
                should.not.exist(cachedToken2)
            })

            // basic auth is not currently supported for MCP server access.
            // Instead, an empty token is sent with scheme 'Basic' to allow the backend to ignore basic auth entries.
            it('should send empty token in auth for MCP servers when httpNodeAuth is set to basic', async function () {
                const token = bobToken
                // Stub MCP registration to return 1 online instance
                sinon.stub(app.db.models.MCPRegistration, 'byTeam').resolves([mockMcpRegistration1])
                sinon.stub(instance, 'liveState').returns({ meta: { state: 'running' } })
                sinon.stub(instance, 'getSetting').resolves({ httpNodeAuth: { type: 'basic', user: 'nodeUser', pass: 'nodePass' } })

                // capture the per-server specs the route hands to the launcher feature fetch
                const captured = stubGetMCPFeatures()
                const response = await app.inject({
                    method: 'POST',
                    url: '/api/v1/expert/mcp/features',
                    cookies: { sid: token },
                    headers: { 'x-chat-transaction-id': 'abc' },
                    payload: { context: { teamId: team.hashid } }
                })
                response.statusCode.should.equal(200)
                // Now assert the per-server spec passed to the launcher feature fetch
                captured.mcpServers.should.be.an.Array().and.have.length(1)
                captured.mcpServers[0].should.have.property('mcpAccessToken').and.be.an.Object()
                // For now, there no support for basic auth. The password is not available.
                // Instead, we send an empty token with scheme 'Basic' to permit the backend to
                // ignore basic auth entries (they are still sent so that they can be returned and listed for user awareness)
                captured.mcpServers[0].mcpAccessToken.should.have.property('token', '')
                captured.mcpServers[0].mcpAccessToken.should.have.property('scheme', 'Basic')
                captured.mcpServers[0].mcpAccessToken.should.have.property('scope').and.be.an.Array().and.have.length(2)
                captured.mcpServers[0].mcpAccessToken.scope.should.containEql('ff-expert:mcp')
                captured.mcpServers[0].mcpAccessToken.scope.should.containEql('instance')
            })

            // Build a byTeam stub registration whose target is a remote instance (device). The MCP
            // features for devices are fetched over MQTT via deviceComms.sendCommandAwaitReply rather
            // than the launcher admin API used for hosted instances.
            const buildDeviceRegistration = (agentVersion = '4.0.0') => ({
                id: 1,
                hashid: 'mcpregdev001',
                name: 'mcp-server-device',
                protocol: 'http',
                targetType: 'device',
                targetId: '999',
                nodeId: 'mcp:node:1',
                endpointRoute: '/mcp',
                TeamId: team.id,
                Device: {
                    hashid: 'devicehash001',
                    id: 999,
                    name: 'device-1',
                    url: 'http://device-1',
                    state: 'running',
                    ApplicationId: application.id,
                    agentVersion,
                    getSetting: sinon.stub().resolves({}) // no special settings
                },
                title: 'Device MCP Server',
                version: '1.0.0-beta',
                description: 'Device MCP Server'
            })

            it('should get mcp features for a device via deviceComms (MQTT proxy)', async function () {
                const token = bobToken
                sinon.stub(app.db.models.MCPRegistration, 'byTeam').resolves([buildDeviceRegistration('4.0.0')])

                // wire up a fake device comms MQTT proxy that answers the live-state and feature requests
                const sendCommandAwaitReply = sinon.stub().callsFake(async (teamHashid, deviceHashid, command, payload) => {
                    if (command === 'get-liveState') {
                        return { state: 'running' }
                    }
                    if (command === 'mcp:get-features') {
                        return payload.mcpEndPoints.map(spec => ({ spec, features: { prompts: [{}], resources: [{}], resourceTemplates: [{}], tools: [{}] } }))
                    }
                    return {}
                })
                app.comms = { devices: { sendCommandAwaitReply } }
                // the launcher admin API (used for hosted instances) must NOT be used for devices
                const getFeatures = sinon.stub(app.containers, 'getMCPFeatures')

                try {
                    const response = await app.inject({
                        method: 'POST',
                        url: '/api/v1/expert/mcp/features',
                        cookies: { sid: token },
                        headers: { 'x-chat-transaction-id': 'abc' },
                        payload: { context: { teamId: team.hashid } }
                    })
                    response.statusCode.should.equal(200)

                    // hosted-instance path must not be used for a device
                    getFeatures.called.should.be.false()

                    // device live-state checked via the MQTT proxy (team hashid + device hashid)
                    sendCommandAwaitReply.calledWith(team.hashid, 'devicehash001', 'get-liveState').should.be.true()

                    // device features fetched via the MQTT proxy, carrying the per-server specs (incl. minted token)
                    const featuresCall = sendCommandAwaitReply.getCalls().find(c => c.args[2] === 'mcp:get-features')
                    should.exist(featuresCall)
                    featuresCall.args[0].should.equal(team.hashid)
                    featuresCall.args[1].should.equal('devicehash001')
                    featuresCall.args[3].should.have.property('mcpEndPoints').which.is.an.Array().and.has.length(1)
                    featuresCall.args[3].mcpEndPoints[0].should.have.property('mcpServer', 'mcpregdev001')
                    featuresCall.args[3].mcpEndPoints[0].should.have.property('mcpAccessToken').and.be.an.Object()

                    const result = response.json()
                    result.should.have.property('servers').which.is.an.Array().and.has.length(1)
                    result.servers[0].should.have.property('instanceType', 'device')
                    result.servers[0].should.have.property('instance', 'devicehash001')
                    result.servers[0].should.have.property('mcpServer', 'mcpregdev001')
                } finally {
                    app.comms = null
                }
            })

            it('should report a device whose agent version is too old as incompatible', async function () {
                const token = bobToken
                // agent version older than MIN_REMOTE_INSTANCE_AGENT_VERSION (4.0.0)
                sinon.stub(app.db.models.MCPRegistration, 'byTeam').resolves([buildDeviceRegistration('3.0.0')])

                const sendCommandAwaitReply = sinon.stub().resolves({ state: 'running' })
                app.comms = { devices: { sendCommandAwaitReply } }

                try {
                    const response = await app.inject({
                        method: 'POST',
                        url: '/api/v1/expert/mcp/features',
                        cookies: { sid: token },
                        headers: { 'x-chat-transaction-id': 'abc' },
                        payload: { context: { teamId: team.hashid } }
                    })
                    response.statusCode.should.equal(200)

                    const result = response.json()
                    result.should.have.property('servers').which.is.an.Array().and.has.length(0)
                    result.should.have.property('incompatibleServers').which.is.an.Array().and.has.length(1)
                    result.incompatibleServers[0].should.have.property('instance', 'devicehash001')
                    result.incompatibleServers[0].should.have.property('instanceType', 'device')
                    result.incompatibleServers[0].should.have.property('currentVersion', '3.0.0')
                    result.incompatibleServers[0].should.have.property('minimumSupportedVersion', '4.0.0')
                    // the version gate happens before any MQTT round-trip - no live-state or feature request should be made
                    sendCommandAwaitReply.called.should.be.false()
                } finally {
                    app.comms = null
                }
            })
        })

        describe('MCP tools Endpoint (tool permissions catalog #421)', function () {
            it('should return 401 for instance token', async function () {
                const response = await app.inject({
                    method: 'GET',
                    url: `/api/v1/expert/mcp/tools?teamId=${team.hashid}`,
                    cookies: { sid: instanceToken }
                })
                response.statusCode.should.equal(401)
            })

            it('should return 401 for device token', async function () {
                const response = await app.inject({
                    method: 'GET',
                    url: `/api/v1/expert/mcp/tools?teamId=${team.hashid}`,
                    cookies: { sid: deviceToken }
                })
                response.statusCode.should.equal(401)
            })

            it('should return 404 for a non-team member', async function () {
                const get = sinon.stub(axios, 'get') // must not proxy for a caller with no team access
                const response = await app.inject({
                    method: 'GET',
                    url: `/api/v1/expert/mcp/tools?teamId=${team.hashid}`,
                    cookies: { sid: chrisToken }
                })
                response.statusCode.should.equal(404)
                get.called.should.be.false()
            })

            // teamId is validated by the querystring schema (required, minLength 10),
            // which runs before the preHandler — so a missing teamId is a 400, not a 404.
            it('should return 400 when the teamId query param is missing', async function () {
                const get = sinon.stub(axios, 'get') // should not be called
                const response = await app.inject({
                    method: 'GET',
                    url: '/api/v1/expert/mcp/tools',
                    cookies: { sid: bobToken }
                })
                response.statusCode.should.equal(400)
                get.called.should.be.false()
            })

            it('should proxy the flow-tools catalog and hash for a team member', async function () {
                const get = sinon.stub(axios, 'get').resolves({
                    data: {
                        catalog: [{ key: 'create-flow', name: 'Create Flow', toolClass: 'write' }],
                        hash: 'abc123'
                    }
                })
                const response = await app.inject({
                    method: 'GET',
                    url: `/api/v1/expert/mcp/tools?teamId=${team.hashid}`,
                    cookies: { sid: bobToken }
                })
                response.statusCode.should.equal(200)
                const json = response.json()
                json.should.have.property('hash', 'abc123')
                json.should.have.property('catalog').which.is.an.Array().and.have.length(1)
                json.catalog[0].should.have.property('key', 'create-flow')
                // the upstream request goes to the agent's /mcp/flow-tools with the service token
                get.calledOnce.should.be.true()
                const [calledUrl, calledOpts] = get.firstCall.args
                calledUrl.should.endWith('/mcp/flow-tools')
                calledOpts.headers.should.have.property('Authorization', 'Bearer test-token')
            })

            it('should default catalog to [] and hash to null when the agent omits them', async function () {
                sinon.stub(axios, 'get').resolves({ data: {} })
                const response = await app.inject({
                    method: 'GET',
                    url: `/api/v1/expert/mcp/tools?teamId=${team.hashid}`,
                    cookies: { sid: bobToken }
                })
                response.statusCode.should.equal(200)
                response.json().should.deepEqual({ catalog: [], hash: null })
            })

            it('should propagate the upstream status code when the agent errors', async function () {
                sinon.stub(axios, 'get').rejects({
                    response: { status: 502, data: { code: 'bad_gateway', error: 'upstream down' } }
                })
                const response = await app.inject({
                    method: 'GET',
                    url: `/api/v1/expert/mcp/tools?teamId=${team.hashid}`,
                    cookies: { sid: bobToken }
                })
                response.statusCode.should.equal(502)
                response.json().should.have.property('code', 'bad_gateway')
            })
        })
    })

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
    })
})
