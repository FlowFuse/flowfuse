const { default: axios } = require('axios')
const LRUCache = require('lru-cache')
const should = require('should') // eslint-disable-line
const sinon = require('sinon')

const { sha256 } = require('../../../../../forge/db/utils.js')
const { Roles } = require('../../../../../forge/lib/roles.js')
// eslint-disable-next-line no-unused-vars
const TestModelFactory = require('../../../../lib/TestModelFactory')
const setup = require('../setup')

describe('Expert API', function () {
    /** @type {LRUCache.LRUCache} */
    let expertMCPAccessTokenCache = null
    async function setupApp (config = {}) {
        const defaultConfig = {
            // Enable dev license for granular rbac tests
            license: 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJGbG93Rm9yZ2UgSW5jLiIsInN1YiI6IkZsb3dGb3JnZSBJbmMuIERldmVsb3BtZW50IiwibmJmIjoxNjYyNDIyNDAwLCJleHAiOjc5ODY5MDIzOTksIm5vdGUiOiJEZXZlbG9wbWVudC1tb2RlIE9ubHkuIE5vdCBmb3IgcHJvZHVjdGlvbiIsInVzZXJzIjoxNTAsInRlYW1zIjo1MCwicHJvamVjdHMiOjUwLCJkZXZpY2VzIjo1MCwiZGV2Ijp0cnVlLCJpYXQiOjE2NjI0ODI5ODd9.e8Jeppq4aURwWYz-rEpnXs9RY2Y7HF7LJ6rMtMZWdw2Xls6-iyaiKV1TyzQw5sUBAhdUSZxgtiFH5e_cNJgrUg',
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

    before(function () {
        // wrap the class LRUCache.LRUCache so that any calls to new LRUCache() in the app code
        // will create an instance of LRUCache.LRUCache that I we can access and clear between tests
        const LRUCacheOriginal = LRUCache.LRUCache
        sinon.stub(LRUCache, 'LRUCache').callsFake(function (options) {
            const c = new LRUCacheOriginal(options)
            if (options && options.name === 'ExpertMCPAccessTokenCache') {
                expertMCPAccessTokenCache = c
            }
            return c
        })
    })

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
            if (expertMCPAccessTokenCache) {
                expertMCPAccessTokenCache.clear()
            }
            // delete all extra users, applications, instances created during tests
            await app.db.models.Project.destroy({ where: { name: ['alice2-instance', 'bob2-instance', 'chris2-instance'] } })
            await app.db.models.Application.destroy({ where: { name: ['application-alice', 'application-bob', 'application-chris'] } })
            await app.db.models.User.destroy({ where: { username: ['alice2', 'bob2', 'chris2'] } })

            sinon.restore()
            // remove all access tokens
            return app.db.models.AccessToken.destroy({ where: {} })
        })

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

                const buildMcpServerFeaturesResponse = (name, applicationHashid, instance, instanceType) => ({
                    team: team.hashid,
                    application: applicationHashid,
                    instance: instanceType === 'instance' ? instance.id : instance.hashid,
                    instanceType,
                    instanceName: instance.name,
                    mcpProtocol: 'http',
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
                            buildMcpServerFeaturesResponse('alice2', applicationAlice2.hashid, instanceAlice2, 'instance'), // an mcp server on alice2 instance
                            buildMcpServerFeaturesResponse('bob2', applicationBob2.hashid, instanceBob2, 'instance'), // an mcp server on bob2 instance
                            buildMcpServerFeaturesResponse('chris2', applicationChris2.hashid, instanceChris2, 'instance') // an mcp server on chris2 instance
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

            it('should generate an access token for MCP server access when feature teamHttpSecurity is enabled', async function () {
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
                const cachedToken = expertMCPAccessTokenCache.get(instance.id)
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
        })

        describe('MCP features Endpoint', function () {
            let mockMcpRegistration1, mockMcpResponseServer1
            beforeEach(async function () {
                await setFeatureForTeam(app, 'teamHttpSecurity', true)
                // create an common reusable MCP registration
                mockMcpRegistration1 = {
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

                }
                mockMcpResponseServer1 = {
                    team: team.hashid,
                    application: application.hashid,
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
            })

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
                const post = sinon.stub(axios, 'post') // should not be called
                const response = await app.inject({
                    method: 'POST',
                    url: '/api/v1/expert/mcp/features',
                    cookies: { sid: token },
                    payload: { context: { teamId: team.hashid } },
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
                                application: application.hashid,
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
                    payload: { context: { teamId: team.hashid } }
                })
                response.statusCode.should.equal(200)

                // check that the post data to expert service was correct
                const axiosPost = axios.post.getCall(0).args[1]
                axiosPost.should.have.property('teamId', team.hashid)
                axiosPost.should.have.property('servers').which.is.an.Array().and.has.length(1)
                // since only 1 instance was correct and online, get index 0 and check its properties
                const reg = axiosPost.servers[0]
                reg.should.only.have.keys('team', 'application', 'instance', 'instanceType', 'instanceName', 'instanceUrl', 'mcpAccessToken', 'mcpServerName', 'mcpEndpoint', 'mcpProtocol', 'title', 'version', 'description')
                reg.should.have.property('team', team.hashid)
                reg.should.have.property('application', application.hashid)
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
                result.servers[0].should.only.have.keys('team', 'application', 'instance', 'instanceType', 'instanceName', 'mcpServerName', 'prompts', 'resources', 'resourceTemplates', 'tools', 'mcpProtocol', 'mcpServerUrl', 'title', 'version', 'description')
                result.servers[0].should.have.property('team', team.hashid)
                result.servers[0].should.have.property('application', application.hashid)
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
                    payload: { context: { teamId: team.hashid } }
                })
                response.statusCode.should.equal(500)
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
                            liveState: () => ({ meta: { state: 'running' } }),
                            getSetting: sinon.stub().resolves({}) // no special settings
                        },
                        title: 'Alices MCP Server',
                        version: '1.0.0-beta',
                        description: 'Alices MCP Server'

                    }, {
                        id: 2, // should be excluded since it is offline
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
                            liveState: () => ({ meta: { state: 'running' } }),
                            getSetting: sinon.stub().resolves({}) // no special settings
                        },
                        title: 'Bobs MCP Server',
                        version: '2.0.0-beta',
                        description: 'Bobs MCP Server'

                    }, {
                        id: 3, // should be excluded since it is for other team
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
                            liveState: () => ({ meta: { state: 'running' } }),
                            getSetting: sinon.stub().resolves({}) // no special settings
                        },
                        title: 'Chris MCP Server',
                        version: '3.0.0-beta',
                        description: 'Chris MCP Server'
                    }
                ])

                const buildMcpServerFeaturesResponse = (name, applicationHashid) => ({
                    team: team.hashid,
                    application: applicationHashid,
                    instance: name,
                    instanceType: 'instance',
                    instanceName: name,
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
                    mcpProtocol: 'http',
                    title: `${name} MCP Server`,
                    version: '1.0.0-beta',
                    description: `${name} MCP Server`
                })

                // Stub axios to return servers
                sinon.stub(axios, 'post').callsFake((url, data) => {
                    return Promise.resolve({
                        data: {
                            transactionId: 'right',
                            servers: [
                                { ...buildMcpServerFeaturesResponse('alice', applicationAlice2.hashid) },
                                { ...buildMcpServerFeaturesResponse('bob', applicationBob2.hashid) },
                                { ...buildMcpServerFeaturesResponse('chris', applicationChris2.hashid) }
                            ]
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

                // fake the axios post response - capture post data and return resolved promise
                let capturedPostData = null
                sinon.stub(axios, 'post').callsFake((url, data) => {
                    capturedPostData = data
                    return Promise.resolve({
                        data: {
                            transactionId: 'abc',
                            servers: [mockMcpResponseServer1]
                        }
                    })
                })
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

                // Now assert the axios post payload (captured async)
                capturedPostData.should.be.an.Object()
                capturedPostData.servers[0].should.have.property('mcpAccessToken').and.be.an.Object()
                capturedPostData.servers[0].mcpAccessToken.should.deepEqual({ token: null, scheme: '', scope: ['ff-expert:mcp', 'instance'] })
            })

            it('should not generate an access token for MCP server when instance setting httpNodeAuth is not set', async function () {
                await setFeatureForTeam(app, 'teamHttpSecurity', true)
                const token = bobToken
                // Stub MCP registration to return 1 online instance
                sinon.stub(app.db.models.MCPRegistration, 'byTeam').resolves([mockMcpRegistration1])
                sinon.stub(instance, 'liveState').returns({ meta: { state: 'running' } })
                sinon.stub(instance, 'getSetting').resolves({}) // no httpNodeAuth settings
                // fake the axios post response - capture post data and return resolved promise
                let capturedPostData = null
                sinon.stub(axios, 'post').callsFake((url, data) => {
                    capturedPostData = data
                    return Promise.resolve({
                        data: {
                            transactionId: 'abc',
                            servers: [mockMcpResponseServer1]
                        }
                    })
                })
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
                // Now assert the axios post payload (captured async)
                capturedPostData.should.be.an.Object()
                capturedPostData.servers[0].should.have.property('mcpAccessToken').and.be.an.Object()
                capturedPostData.servers[0].mcpAccessToken.should.deepEqual({ token: null, scheme: '', scope: ['ff-expert:mcp', 'instance'] })
            })

            it('should generate an access token for MCP server access when feature teamHttpSecurity is enabled', async function () {
                const token = bobToken
                // Stub MCP registration to return 1 online instance
                sinon.stub(app.db.models.MCPRegistration, 'byTeam').resolves([mockMcpRegistration1])
                sinon.stub(instance, 'liveState').returns({ meta: { state: 'running' } })
                sinon.stub(instance, 'getSetting').resolves({ httpNodeAuth: { type: 'flowforge-user' } })

                // fake the axios post response - capture post data and return resolved promise
                let capturedPostData = null
                sinon.stub(axios, 'post').callsFake((url, data) => {
                    capturedPostData = data
                    return Promise.resolve({
                        data: {
                            transactionId: 'abc',
                            servers: [mockMcpResponseServer1]
                        }
                    })
                })
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
                const cachedToken = expertMCPAccessTokenCache.get(instance.id)
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
                capturedPostData.servers[0].should.have.property('mcpAccessToken').and.be.an.Object()
                capturedPostData.servers[0].mcpAccessToken.should.deepEqual({
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

                // fake the axios post response - check that the access token is included in the post data
                sinon.stub(axios, 'post').callsFake((url, data) => {
                    return Promise.resolve({
                        data: {
                            transactionId: 'abc',
                            servers: [mockMcpResponseServer1]
                        }
                    })
                })
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

            // basic auth tests
            it('should use basic auth for MCP server access when httpNodeAuth is set to basic', async function () {
                const token = bobToken
                // Stub MCP registration to return 1 online instance
                sinon.stub(app.db.models.MCPRegistration, 'byTeam').resolves([mockMcpRegistration1])
                sinon.stub(instance, 'liveState').returns({ meta: { state: 'running' } })
                sinon.stub(instance, 'getSetting').resolves({ httpNodeAuth: { type: 'basic', user: 'nodeUser', pass: 'nodePass' } })

                // fake the axios post response - capture post data and return resolved promise
                let capturedPostData = null
                sinon.stub(axios, 'post').callsFake((url, data) => {
                    capturedPostData = data
                    return Promise.resolve({
                        data: {
                            transactionId: 'abc',
                            servers: [mockMcpResponseServer1]
                        }
                    })
                })
                const response = await app.inject({
                    method: 'POST',
                    url: '/api/v1/expert/mcp/features',
                    cookies: { sid: token },
                    headers: { 'x-chat-transaction-id': 'abc' },
                    payload: { context: { teamId: team.hashid } }
                })
                response.statusCode.should.equal(200)
                // Now assert the axios post payload (captured async)
                capturedPostData.should.be.an.Object()
                capturedPostData.should.have.property('servers').which.is.an.Array()
                capturedPostData.servers[0].should.have.property('mcpAccessToken')
                capturedPostData.servers[0].mcpAccessToken.should.be.an.Object()
                capturedPostData.servers[0].mcpAccessToken.should.have.property('token', Buffer.from('nodeUser:nodePass').toString('base64'))
                capturedPostData.servers[0].mcpAccessToken.should.have.property('scheme', 'Basic')
                capturedPostData.servers[0].mcpAccessToken.should.have.property('scope').and.be.an.Array().and.have.length(2)
                capturedPostData.servers[0].mcpAccessToken.scope.should.containEql('ff-expert:mcp')
                capturedPostData.servers[0].mcpAccessToken.scope.should.containEql('instance')
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
})
