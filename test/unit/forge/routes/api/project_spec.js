const crypto = require('crypto')
const sleep = require('util').promisify(setTimeout)

const should = require('should') // eslint-disable-line
const sinon = require('sinon')

const { addFlowsToProject } = require('../../../../lib/Snapshots')
const { decryptCreds } = require('../../../../lib/credentials')
const setup = require('../setup')

const FF_UTIL = require('flowforge-test-utils')
const { Roles } = FF_UTIL.require('forge/lib/roles')
const { KEY_HEALTH_CHECK_INTERVAL, KEY_DISABLE_AUTO_SAFE_MODE } = FF_UTIL.require('forge/db/models/ProjectSettings')
const { START_DELAY, STOP_DELAY } = FF_UTIL.require('forge/containers/stub/index.js')

describe('Project API', function () {
    let app
    let projectInstanceCount = 0
    const generateProjectName = () => 'test-project' + (projectInstanceCount++)
    const TestObjects = {}

    async function setupApp (options) {
        const setupConfig = { limits: { instances: 50 }, domain: 'flowforge.dev', ...options }
        app = await setup(setupConfig)

        TestObjects.project1 = app.project

        // alice : admin
        // bob
        // chris
        // dave: Viewer Role in CTeam
        // evan: Dashboard role in CTeam

        // ATeam ( alice (owner), bob )
        // BTeam ( alice (owner), bob (owner), chris)
        // CTeam ( chris (owner) )

        // Alice create in setup()
        TestObjects.alice = await app.db.models.User.byUsername('alice')
        TestObjects.bob = await app.db.models.User.create({ username: 'bob', name: 'Bob Solo', email: 'bob@example.com', email_verified: true, password: 'bbPassword' })
        TestObjects.chris = await app.db.models.User.create({ username: 'chris', name: 'Chris Kenobi', email: 'chris@example.com', email_verified: true, password: 'ccPassword' })
        TestObjects.dave = await app.db.models.User.create({ username: 'dave', name: 'Dave vader', email: 'dave@example.com', email_verified: true, password: 'ddPassword' })
        TestObjects.evan = await app.db.models.User.create({ username: 'evan', name: 'Evan vader', email: 'evan@example.com', email_verified: true, password: 'eePassword' })

        // ATeam create in setup()
        TestObjects.ATeam = await app.db.models.Team.byName('ATeam')
        TestObjects.BTeam = await app.db.models.Team.create({ name: 'BTeam', TeamTypeId: app.defaultTeamType.id })
        TestObjects.CTeam = await app.db.models.Team.create({ name: 'CTeam', TeamTypeId: app.defaultTeamType.id })

        TestObjects.ApplicationA = app.application
        TestObjects.ApplicationB = await app.factory.createApplication({ name: 'ApplicationB' }, TestObjects.BTeam)
        TestObjects.ApplicationC = await app.factory.createApplication({ name: 'ApplicationC' }, TestObjects.CTeam)

        await TestObjects.ATeam.addUser(TestObjects.bob, { through: { role: Roles.Member } })
        await TestObjects.BTeam.addUser(TestObjects.alice, { through: { role: Roles.Owner } })
        await TestObjects.BTeam.addUser(TestObjects.bob, { through: { role: Roles.Owner } })
        await TestObjects.BTeam.addUser(TestObjects.chris, { through: { role: Roles.Member } })
        await TestObjects.CTeam.addUser(TestObjects.chris, { through: { role: Roles.Owner } })
        await TestObjects.CTeam.addUser(TestObjects.dave, { through: { role: Roles.Viewer } })
        await TestObjects.CTeam.addUser(TestObjects.evan, { through: { role: Roles.Dashboard } })

        TestObjects.tokens = {}
        await login('alice', 'aaPassword')
        await login('bob', 'bbPassword')
        await login('chris', 'ccPassword')
        await login('dave', 'ddPassword')
        await login('evan', 'eePassword')

        // TestObjects.tokens.alice = (await app.db.controllers.AccessToken.createTokenForPasswordReset(TestObjects.alice)).token
        TestObjects.tokens.project = (await app.project.refreshAuthTokens()).token

        TestObjects.projectType1 = app.projectType
        TestObjects.template1 = app.template
        TestObjects.stack1 = app.stack
    }

    async function enableTeamTypeFeatureFlag (app, enabled, featureName, teamTypeName = 'starter') {
        const defaultTeamType = await app.db.models.TeamType.findOne({ where: { name: teamTypeName } })
        const defaultTeamTypeProperties = defaultTeamType.properties
        defaultTeamTypeProperties.features[featureName] = enabled
        defaultTeamType.properties = defaultTeamTypeProperties
        await defaultTeamType.save()
    }

    before(async function () {
        await setupApp()
    })

    after(async function () {
        await app.close()
    })

    async function login (username, password) {
        const response = await app.inject({
            method: 'POST',
            url: '/account/login',
            payload: { username, password, remember: false }
        })
        response.cookies.should.have.length(1)
        response.cookies[0].should.have.property('name', 'sid')
        TestObjects.tokens[username] = response.cookies[0].value
    }

    async function createInstance (start = false) {
        return app.factory.createInstance(
            { name: generateProjectName() },
            app.application,
            app.stack,
            app.template,
            app.projectType,
            { start }
        )
    }
    async function duplicateProject (srcId, team, template, stack, duplicateOpts, accessToken, name) {
        const responseCopiedProject = await app.inject({
            method: 'POST',
            url: '/api/v1/projects',
            payload: {
                name: name || generateProjectName(),
                applicationId: TestObjects.ApplicationA.hashid,
                projectType: TestObjects.projectType1.hashid,
                template,
                stack,
                sourceProject: {
                    id: srcId,
                    options: duplicateOpts
                }
            },
            cookies: { sid: accessToken }
        })
        return await app.db.models.Project.byId(responseCopiedProject.json().id)
    }
    async function getProjectInfo (id, token, type) {
        return (await app.inject({
            method: 'GET',
            url: `/storage/${id}/${type}`,
            headers: {
                authorization: `Bearer ${token}`
            }
        })).json()
    }

    describe('Create project', function () {
        it('Non-owner cannot create project', async function () {
            // Chris (non-owner) cannot create in ATeam
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/projects',
                payload: {
                    name: generateProjectName(),
                    applicationId: TestObjects.ApplicationA.hashid,
                    projectType: TestObjects.projectType1.hashid,
                    template: TestObjects.template1.hashid,
                    stack: TestObjects.stack1.hashid
                },
                cookies: { sid: TestObjects.tokens.chris }
            })
            response.statusCode.should.equal(401)
        })

        it('Non-member cannot create project', async function () {
            // Bob (non-member) cannot create in CTeam
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/projects',
                payload: {
                    name: generateProjectName(),
                    applicationId: TestObjects.ApplicationC.hashid,
                    projectType: TestObjects.projectType1.hashid,
                    template: TestObjects.template1.hashid,
                    stack: TestObjects.stack1.hashid
                },
                cookies: { sid: TestObjects.tokens.bob }
            })
            response.statusCode.should.equal(401)
        })

        it('Non-member admin can create project', async function () {
            // Alice (non-member admin) cannot create in CTeam
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/projects',
                payload: {
                    name: generateProjectName(),
                    applicationId: TestObjects.ApplicationC.hashid,
                    projectType: TestObjects.projectType1.hashid,
                    template: TestObjects.template1.hashid,
                    stack: TestObjects.stack1.hashid
                },
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(200)
            const result = response.json()
            result.should.have.property('id')
        })

        it('Fails for unknown template', async function () {
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/projects',
                payload: {
                    name: generateProjectName(),
                    applicationId: TestObjects.ApplicationA.hashid,
                    projectType: TestObjects.projectType1.hashid,
                    template: 'doesnotexist',
                    stack: TestObjects.stack1.hashid
                },
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(400)
            const result = response.json()
            result.should.have.property('error', 'Invalid template')
        })

        it('Fails for unknown stack', async function () {
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/projects',
                payload: {
                    name: generateProjectName(),
                    applicationId: TestObjects.ApplicationA.hashid,
                    projectType: TestObjects.projectType1.hashid,
                    template: TestObjects.template1.hashid,
                    stack: 'doesnotexist'
                },
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(400)
            const result = response.json()
            result.should.have.property('error', 'Invalid stack')
        })

        it('Fails for unknown project type', async function () {
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/projects',
                payload: {
                    name: generateProjectName(),
                    applicationId: TestObjects.ApplicationA.hashid,
                    projectType: 'doesnotexist',
                    template: TestObjects.template1.hashid,
                    stack: TestObjects.stack1.hashid
                },
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(400)
            const result = response.json()
            result.should.have.property('error', 'Invalid project type')
        })

        it('Fails for duplicate project name', async function () {
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/projects',
                payload: {
                    name: TestObjects.project1.name,
                    applicationId: TestObjects.ApplicationA.hashid,
                    projectType: TestObjects.projectType1.hashid,
                    template: TestObjects.template1.hashid,
                    stack: TestObjects.stack1.hashid
                },
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(409)
            const result = response.json()
            result.should.have.property('error', 'name in use')
        })

        it('Fails for duplicate project name (with different case)', async function () {
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/projects',
                payload: {
                    name: TestObjects.project1.name.toUpperCase(),
                    applicationId: TestObjects.ApplicationA.hashid,
                    projectType: TestObjects.projectType1.hashid,
                    template: TestObjects.template1.hashid,
                    stack: TestObjects.stack1.hashid
                },
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(409)
            const result = response.json()
            result.should.have.property('error', 'name in use')
        })
        it('Fails for project name containing characters other than a-zA-Z0-9- ', async function () {
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/projects',
                payload: {
                    name: 'this-$hould-fail',
                    applicationId: TestObjects.ApplicationA.hashid,
                    projectType: TestObjects.projectType1.hashid,
                    template: TestObjects.template1.hashid,
                    stack: TestObjects.stack1.hashid
                },
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(409)
            const result = response.json()
            result.should.have.property('error', 'name not allowed')
        })
        it('Fails for project name starting with a number', async function () {
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/projects',
                payload: {
                    name: '12345-once-i-caught-a-fish-alive',
                    applicationId: TestObjects.ApplicationA.hashid,
                    projectType: TestObjects.projectType1.hashid,
                    template: TestObjects.template1.hashid,
                    stack: TestObjects.stack1.hashid
                },
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(409)
            const result = response.json()
            result.should.have.property('error', 'name not allowed')
        })
        it('Fails for project name starting with a dash', async function () {
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/projects',
                payload: {
                    name: '-dash-dash-dot-dot-dot',
                    applicationId: TestObjects.ApplicationA.hashid,
                    projectType: TestObjects.projectType1.hashid,
                    template: TestObjects.template1.hashid,
                    stack: TestObjects.stack1.hashid
                },
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(409)
            const result = response.json()
            result.should.have.property('error', 'name not allowed')
        })

        it('Create a project', async function () {
            const projectName = generateProjectName()
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/projects',
                payload: {
                    name: projectName,
                    applicationId: TestObjects.ApplicationA.hashid,
                    projectType: TestObjects.projectType1.hashid,
                    template: TestObjects.template1.hashid,
                    stack: TestObjects.stack1.hashid
                },
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(200)
            const result = response.json()
            result.should.have.property('id')
            result.should.have.property('name', projectName)
            result.should.have.property('safeName', projectName)
            result.should.have.property('team')
            result.should.have.property('projectType')
            result.should.have.property('url')
            result.url.should.not.be.empty()
            result.projectType.should.have.property('id', TestObjects.projectType1.hashid)
            result.should.have.property('template')
            result.template.should.have.property('id', TestObjects.template1.hashid)
            result.should.have.property('stack')
            result.stack.should.have.property('id', TestObjects.stack1.hashid)
            // ensure settings.header.title gets the project name set by default
            const newProject = await app.db.models.Project.byId(result.id)
            const newAccessToken = (await newProject.refreshAuthTokens()).token
            const runtimeSettings = (await app.inject({
                method: 'GET',
                url: `/api/v1/projects/${newProject.id}/settings`,
                headers: {
                    authorization: `Bearer ${newAccessToken}`
                }
            })).json()
            runtimeSettings.should.have.property('settings')
            runtimeSettings.settings.should.have.property('header')
            runtimeSettings.settings.header.should.have.property('title', projectName)

            // should get a copy of the templates palette modules
            runtimeSettings.settings.should.have.property('palette')
            runtimeSettings.settings.palette.should.have.property('modules')
            runtimeSettings.settings.palette.modules.should.only.have.keys('node-red-dashboard', 'node-red-contrib-ping')
            runtimeSettings.settings.palette.modules.should.have.property('node-red-dashboard', '3.0.0')
            runtimeSettings.settings.palette.modules.should.have.property('node-red-contrib-ping', '0.3.0')

            runtimeSettings.settings.palette.should.not.have.property('npmrc')
            runtimeSettings.settings.palette.should.not.have.property('catalogue')

            runtimeSettings.should.have.property('env').which.have.property('FF_PROJECT_ID', result.id) // depreciated in favour of FF_INSTANCE_ID as of V1.6.0
            runtimeSettings.should.have.property('env').which.have.property('FF_PROJECT_NAME', projectName) // depreciated in favour of FF_INSTANCE_NAME as of V1.6.0
            runtimeSettings.should.have.property('env').which.have.property('FF_INSTANCE_ID', result.id)
            runtimeSettings.should.have.property('env').which.have.property('FF_INSTANCE_NAME', projectName)
        })

        it('Create a project with upper case characters in name', async function () {
            const projectName = 'Upper-Case-' + generateProjectName()
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/projects',
                payload: {
                    name: projectName,
                    applicationId: TestObjects.ApplicationA.hashid,
                    projectType: TestObjects.projectType1.hashid,
                    template: TestObjects.template1.hashid,
                    stack: TestObjects.stack1.hashid
                },
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(200)
            const result = response.json()
            result.should.have.property('id')
            result.should.have.property('name', projectName)
            result.should.have.property('safeName', projectName.toLowerCase())
            result.should.have.property('team')
            result.should.have.property('projectType')
            result.projectType.should.have.property('id', TestObjects.projectType1.hashid)
            result.should.have.property('template')
            result.template.should.have.property('id', TestObjects.template1.hashid)
            result.should.have.property('stack')
            result.stack.should.have.property('id', TestObjects.stack1.hashid)
            // ensure settings.header.title gets the project name set by default
            const newProject = await app.db.models.Project.byId(result.id)
            const newAccessToken = (await newProject.refreshAuthTokens()).token
            const runtimeSettings = (await app.inject({
                method: 'GET',
                url: `/api/v1/projects/${newProject.id}/settings`,
                headers: {
                    authorization: `Bearer ${newAccessToken}`
                }
            })).json()
            runtimeSettings.should.have.property('settings')
            runtimeSettings.settings.should.have.property('header')
            runtimeSettings.settings.header.should.have.property('title', projectName)
        })
        it('Should not merge template modules into existing instance runtime settings', async function () {
            const projectName = generateProjectName()
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/projects',
                payload: {
                    name: projectName,
                    applicationId: TestObjects.ApplicationA.hashid,
                    projectType: TestObjects.projectType1.hashid,
                    template: TestObjects.template1.hashid,
                    stack: TestObjects.stack1.hashid
                },
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(200)
            const result = response.json()

            const newProject = await app.db.models.Project.byId(result.id)
            const newAccessToken = (await newProject.refreshAuthTokens()).token
            const runtimeSettings = (await app.inject({
                method: 'GET',
                url: `/api/v1/projects/${newProject.id}/settings`,
                headers: {
                    authorization: `Bearer ${newAccessToken}`
                }
            })).json()

            // should get a copy of the templates palette modules
            runtimeSettings.settings.should.have.property('palette')
            runtimeSettings.settings.palette.should.have.property('modules')
            runtimeSettings.settings.palette.modules.should.only.have.keys('node-red-dashboard', 'node-red-contrib-ping')
            runtimeSettings.settings.palette.modules.should.have.property('node-red-dashboard', '3.0.0')
            runtimeSettings.settings.palette.modules.should.have.property('node-red-contrib-ping', '0.3.0')

            // now we update the templates palette modules
            // via put `/api/v1/templates/${templateId}`
            const templateSettings = TestObjects.template1.settings
            templateSettings.palette.modules.find(e => e.name === 'node-red-dashboard').version = '3.0.1' // **upgraded**
            templateSettings.palette.modules.find(e => e.name === 'node-red-contrib-ping').version = '0.2.9' // **downgraded**
            templateSettings.palette.modules.push({ name: 'node-red-node-random', version: '0.3.0' }) // **new**
            const template = await app.db.models.ProjectTemplate.byId(TestObjects.template1.id)
            template.settings = templateSettings
            await template.save()

            // check the template now has 3 modules
            const templateReloaded = await app.db.models.ProjectTemplate.byId(TestObjects.template1.id)
            templateReloaded.settings.palette.modules.should.have.length(3)

            // get the projects runtime settings once more - the palette modules should not have changed (should not be merged)
            const runtimeSettings2 = (await app.inject({
                method: 'GET',
                url: `/api/v1/projects/${newProject.id}/settings`,
                headers: {
                    authorization: `Bearer ${newAccessToken}`
                }
            })).json()
            runtimeSettings2.settings.should.have.property('palette')
            runtimeSettings2.settings.palette.should.have.property('modules')
            runtimeSettings2.settings.palette.modules.should.only.have.keys('node-red-dashboard', 'node-red-contrib-ping')
            runtimeSettings2.settings.palette.modules.should.have.property('node-red-dashboard', '3.0.0') // same as were added to the project upon creation from template1
            runtimeSettings2.settings.palette.modules.should.have.property('node-red-contrib-ping', '0.3.0') // same as were added to the project upon creation from template1
        })

        describe('Copy project', function () {
            it('Create a project cloned from existing one - include everything', async function () {
                // Setup some flows/credentials
                await addFlowsToProject(app,
                    TestObjects.project1.id,
                    TestObjects.tokens.project,
                    TestObjects.tokens.alice,
                    [{ id: 'node1' }],
                    { testCreds: 'abc' },
                    'key1',
                    {
                        httpAdminRoot: '/test-red',
                        dashboardUI: '/test-dash',
                        env: [
                            { name: 'one', value: 'a' },
                            { name: 'two', value: 'b' },
                            { name: 'three', value: 'c', hidden: true }
                        ]
                    }
                )
                const response = await app.inject({
                    method: 'POST',
                    url: '/api/v1/projects',
                    payload: {
                        name: generateProjectName(),
                        applicationId: TestObjects.ApplicationA.hashid,
                        projectType: TestObjects.projectType1.hashid,
                        template: TestObjects.template1.hashid,
                        stack: TestObjects.stack1.hashid,
                        sourceProject: {
                            id: TestObjects.project1.id,
                            options: {
                                flows: true,
                                credentials: true,
                                envVars: true
                            }
                        }
                    },
                    cookies: { sid: TestObjects.tokens.alice }
                })
                response.statusCode.should.equal(200)

                const newProject = await app.db.models.Project.byId(response.json().id)
                const newAccessToken = (await newProject.refreshAuthTokens()).token

                const newFlows = await getProjectInfo(newProject.id, newAccessToken, 'flows')
                newFlows.should.have.length(1)
                newFlows[0].should.have.property('id', 'node1')
                const newCreds = await getProjectInfo(newProject.id, newAccessToken, 'credentials')
                newCreds.should.have.property('$')
                const newSettings = await getProjectInfo(newProject.id, newAccessToken, 'settings')
                newSettings.should.not.have.property('_credentialSecret')
                const newCredKey = await newProject.getSetting('credentialSecret')
                should(newCredKey).be.type('string', 'credentialSecret should be an auto generated string')
                should(newCredKey.length).be.Number().eql(64, 'credentialSecret should be an auto generated string of 64 characters')
                const srcCredKey = await TestObjects.project1.getSetting('credentialSecret')
                newCredKey.should.not.eql(srcCredKey)
                const newKey = crypto.createHash('sha256').update(newCredKey).digest()
                const decrypted = decryptCreds(newKey, newCreds)
                decrypted.should.have.property('testCreds', 'abc')

                const runtimeSettings = (await app.inject({
                    method: 'GET',
                    url: `/api/v1/projects/${newProject.id}/settings`,
                    headers: {
                        authorization: `Bearer ${newAccessToken}`
                    }
                })).json()
                runtimeSettings.should.have.property('settings')
                runtimeSettings.settings.should.have.property('header')
                // ensure settings.header.title gets the project name set by default
                runtimeSettings.settings.header.should.have.property('title', response.json().name)
                runtimeSettings.settings.should.not.have.property('credentialSecret')
                runtimeSettings.settings.should.have.property('httpAdminRoot', '/test-red')
                runtimeSettings.settings.should.have.property('dashboardUI', '/test-dash')
                runtimeSettings.should.have.property('env')
                runtimeSettings.env.should.have.property('one', 'a')
                runtimeSettings.env.should.have.property('two', 'b')
                runtimeSettings.env.should.have.property('three', 'c')
            })

            it('Create a project cloned from existing one - env-var keys only', async function () {
                // Setup some flows/credentials
                await addFlowsToProject(app,
                    TestObjects.project1.id,
                    TestObjects.tokens.project,
                    TestObjects.tokens.alice,
                    [{ id: 'node1' }],
                    { testCreds: 'abc' },
                    'key1',
                    {
                        httpAdminRoot: '/test-red',
                        env: [
                            { name: 'one', value: 'a' },
                            { name: 'two', value: 'b' }
                        ]
                    }
                )

                const response = await app.inject({
                    method: 'POST',
                    url: '/api/v1/projects',
                    payload: {
                        name: generateProjectName(),
                        projectType: TestObjects.projectType1.hashid,
                        template: TestObjects.template1.hashid,
                        stack: TestObjects.stack1.hashid,
                        applicationId: TestObjects.ApplicationA.hashid,
                        sourceProject: {
                            id: TestObjects.project1.id,
                            options: {
                                flows: true,
                                credentials: true,
                                envVars: 'keys'
                            }
                        }
                    },
                    cookies: { sid: TestObjects.tokens.alice }
                })
                response.statusCode.should.equal(200)

                const newProject = await app.db.models.Project.byId(response.json().id)
                const newAccessToken = (await newProject.refreshAuthTokens()).token

                const runtimeSettings = (await app.inject({
                    method: 'GET',
                    url: `/api/v1/projects/${newProject.id}/settings`,
                    headers: {
                        authorization: `Bearer ${newAccessToken}`
                    }
                })).json()
                runtimeSettings.settings.should.not.have.property('credentialSecret')
                const newCredsKey = await newProject.getSetting('credentialSecret')
                should(newCredsKey).be.type('string', 'credentialSecret should be an auto generated string')
                should(newCredsKey.length).be.Number().eql(64, 'credentialSecret should be an auto generated string of 64 characters')
                runtimeSettings.should.have.property('env')
                runtimeSettings.env.should.have.property('one', '')
                runtimeSettings.env.should.have.property('two', '')
            })

            it('Create a project cloned from existing one - no env-vars', async function () {
                // Setup some flows/credentials
                await addFlowsToProject(app,
                    TestObjects.project1.id,
                    TestObjects.tokens.project,
                    TestObjects.tokens.alice,
                    [{ id: 'node1' }],
                    { testCreds: 'abc' },
                    'key1',
                    {
                        httpAdminRoot: '/test-red',
                        env: [
                            { name: 'one', value: 'a' },
                            { name: 'two', value: 'b' }
                        ]
                    }
                )

                const response = await app.inject({
                    method: 'POST',
                    url: '/api/v1/projects',
                    payload: {
                        name: generateProjectName(),
                        projectType: TestObjects.projectType1.hashid,
                        template: TestObjects.template1.hashid,
                        stack: TestObjects.stack1.hashid,
                        applicationId: TestObjects.ApplicationA.hashid,
                        sourceProject: {
                            id: TestObjects.project1.id,
                            options: {
                                flows: true,
                                credentials: true,
                                envVars: false
                            }
                        }
                    },
                    cookies: { sid: TestObjects.tokens.alice }
                })
                response.statusCode.should.equal(200)

                const newProject = await app.db.models.Project.byId(response.json().id)
                const newAccessToken = (await newProject.refreshAuthTokens()).token

                const runtimeSettings = (await app.inject({
                    method: 'GET',
                    url: `/api/v1/projects/${newProject.id}/settings`,
                    headers: {
                        authorization: `Bearer ${newAccessToken}`
                    }
                })).json()
                runtimeSettings.settings.should.not.have.property('credentialSecret')
                const newCredsKey = await newProject.getSetting('credentialSecret')
                should(newCredsKey).be.type('string', 'credentialSecret should be an auto generated string')
                should(newCredsKey.length).be.Number().eql(64, 'credentialSecret should be an auto generated string of 64 characters')
                runtimeSettings.should.have.property('env')
                runtimeSettings.env.should.not.have.property('one')
                runtimeSettings.env.should.not.have.property('two')
            })

            it('Create a project cloned from existing one - no credentials', async function () {
                // Setup some flows/credentials
                await addFlowsToProject(app,
                    TestObjects.project1.id,
                    TestObjects.tokens.project,
                    TestObjects.tokens.alice,
                    [{ id: 'node1' }],
                    { testCreds: 'abc' },
                    'key1',
                    {
                        httpAdminRoot: '/test-red',
                        env: [
                            { name: 'one', value: 'a' },
                            { name: 'two', value: 'b' }
                        ]
                    }
                )

                const response = await app.inject({
                    method: 'POST',
                    url: '/api/v1/projects',
                    payload: {
                        name: generateProjectName(),
                        projectType: TestObjects.projectType1.hashid,
                        template: TestObjects.template1.hashid,
                        stack: TestObjects.stack1.hashid,
                        applicationId: TestObjects.ApplicationA.hashid,
                        sourceProject: {
                            id: TestObjects.project1.id,
                            options: {
                                flows: true,
                                credentials: false,
                                envVars: false
                            }
                        }
                    },
                    cookies: { sid: TestObjects.tokens.alice }
                })
                response.statusCode.should.equal(200)

                const newProject = await app.db.models.Project.byId(response.json().id)
                const newAccessToken = (await newProject.refreshAuthTokens()).token

                // Creds should be empty
                const newCreds = await getProjectInfo(newProject.id, newAccessToken, 'credentials')
                Object.keys(newCreds).should.have.length(0)
            })

            it('Create a project cloned from existing one - no flows/creds', async function () {
                // Setup some flows/credentials
                await addFlowsToProject(app,
                    TestObjects.project1.id,
                    TestObjects.tokens.project,
                    TestObjects.tokens.alice,
                    [{ id: 'node1' }],
                    { testCreds: 'abc' },
                    'key1',
                    {
                        httpAdminRoot: '/test-red',
                        env: [
                            { name: 'one', value: 'a' },
                            { name: 'two', value: 'b' }
                        ]
                    }
                )

                const response = await app.inject({
                    method: 'POST',
                    url: '/api/v1/projects',
                    payload: {
                        name: generateProjectName(),
                        projectType: TestObjects.projectType1.hashid,
                        template: TestObjects.template1.hashid,
                        stack: TestObjects.stack1.hashid,
                        applicationId: TestObjects.ApplicationA.hashid,
                        sourceProject: {
                            id: TestObjects.project1.id,
                            options: {
                                flows: false,
                                credentials: false,
                                envVars: true
                            }
                        }
                    },
                    cookies: { sid: TestObjects.tokens.alice }
                })
                response.statusCode.should.equal(200)

                const newProject = await app.db.models.Project.byId(response.json().id)
                const newAccessToken = (await newProject.refreshAuthTokens()).token

                // Flows should be empty
                const newFlows = await getProjectInfo(newProject.id, newAccessToken, 'flows')
                newFlows.should.have.length(0)
                // Creds should be empty
                const newCreds = await getProjectInfo(newProject.id, newAccessToken, 'credentials')
                Object.keys(newCreds).should.have.length(0)

                const runtimeSettings = (await app.inject({
                    method: 'GET',
                    url: `/api/v1/projects/${newProject.id}/settings`,
                    headers: {
                        authorization: `Bearer ${newAccessToken}`
                    }
                })).json()
                runtimeSettings.settings.should.not.have.property('credentialSecret')
                const newCredsKey = await newProject.getSetting('credentialSecret')
                should(newCredsKey).be.type('string', 'credentialSecret should be an auto generated string')
                should(newCredsKey.length).be.Number().eql(64, 'credentialSecret should be an auto generated string of 64 characters')
                runtimeSettings.should.have.property('env')
                runtimeSettings.env.should.have.property('one')
                runtimeSettings.env.should.have.property('two')
            })

            it('Fails to copy project to a different team', async function () {
                const response = await app.inject({
                    method: 'POST',
                    url: '/api/v1/projects',
                    payload: {
                        name: generateProjectName(),
                        applicationId: TestObjects.ApplicationB.hashid,
                        projectType: TestObjects.projectType1.hashid,
                        template: TestObjects.template1.hashid,
                        stack: TestObjects.stack1.hashid,
                        sourceProject: {
                            id: TestObjects.project1.id,
                            options: {
                                flows: true,
                                credentials: true,
                                envVars: true
                            }
                        }
                    },
                    cookies: { sid: TestObjects.tokens.alice }
                })
                response.statusCode.should.equal(403)
            })

            it('Fails to copy unknown project', async function () {
                const response = await app.inject({
                    method: 'POST',
                    url: '/api/v1/projects',
                    payload: {
                        name: generateProjectName(),
                        applicationId: TestObjects.ApplicationA.hashid,
                        projectType: TestObjects.projectType1.hashid,
                        template: TestObjects.template1.hashid,
                        stack: TestObjects.stack1.hashid,
                        sourceProject: {
                            id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
                            options: {
                                flows: true,
                                credentials: true,
                                envVars: true
                            }
                        }
                    },
                    cookies: { sid: TestObjects.tokens.alice }
                })
                response.statusCode.should.equal(400)
            })
        })

        describe('EE Options', function () {
            before(async function () {
                const license = 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJGbG93Rm9yZ2UgSW5jLiIsInN1YiI6IkZsb3dGb3JnZSBJbmMuIERldmVsb3BtZW50IiwibmJmIjoxNjYyNTk1MjAwLCJleHAiOjc5ODcwNzUxOTksIm5vdGUiOiJEZXZlbG9wbWVudC1tb2RlIE9ubHkuIE5vdCBmb3IgcHJvZHVjdGlvbiIsInVzZXJzIjoxNTAsInRlYW1zIjo1MCwicHJvamVjdHMiOjUwLCJkZXZpY2VzIjoyLCJkZXYiOnRydWUsImlhdCI6MTY2MjY1MzkyMX0.Tj4fnuDuxi_o5JYltmVi1Xj-BRn0aEjwRPa_fL2MYa9MzSwnvJEd-8bsRM38BQpChjLt-wN-2J21U7oSq2Fp5A'
                await app.close()
                await setupApp({
                    license,
                    'ff-npm-registry': {
                        url: 'https://localhost:1234',
                        catalogue: {
                            certifiedNodes: 'https://localhost/cert-nodes-catalogue.json',
                            ffNodes: 'https://localhost/ff-nodes-catalogue.json'
                        }
                    }

                })
            })
            after(async function () {
                // After this set of tests, close the app and recreate (ie remove the license)
                await app.close()
                await setupApp()
            })
            it('Fails for invalid ha settings', async function () {
                const response = await app.inject({
                    method: 'POST',
                    url: '/api/v1/projects',
                    payload: {
                        name: generateProjectName(),
                        applicationId: TestObjects.ApplicationA.hashid,
                        projectType: TestObjects.projectType1.hashid,
                        template: TestObjects.template1.hashid,
                        stack: TestObjects.stack1.hashid,
                        ha: { replicas: 0 }
                    },
                    cookies: { sid: TestObjects.tokens.alice }
                })
                response.statusCode.should.equal(400)
                const result = response.json()
                result.should.have.property('code', 'invalid_ha')

                const response2 = await app.inject({
                    method: 'POST',
                    url: '/api/v1/projects',
                    payload: {
                        name: generateProjectName(),
                        applicationId: TestObjects.ApplicationA.hashid,
                        projectType: TestObjects.projectType1.hashid,
                        template: TestObjects.template1.hashid,
                        stack: TestObjects.stack1.hashid,
                        ha: { replicas: 3 }
                    },
                    cookies: { sid: TestObjects.tokens.alice }
                })
                response2.statusCode.should.equal(400)
                const result2 = response2.json()
                result2.should.have.property('code', 'invalid_ha')
            })

            it('Creates project with ee settings applied', async function () {
                const response = await app.inject({
                    method: 'POST',
                    url: '/api/v1/projects',
                    payload: {
                        name: generateProjectName(),
                        applicationId: TestObjects.ApplicationA.hashid,
                        projectType: TestObjects.projectType1.hashid,
                        template: TestObjects.template1.hashid,
                        stack: TestObjects.stack1.hashid,
                        ha: { replicas: 2 }
                    },
                    cookies: { sid: TestObjects.tokens.alice }
                })
                response.statusCode.should.equal(200)
                const result = response.json()
                result.should.have.property('ha')
                result.ha.should.have.property('replicas', 2)
            })

            it('Check Project Settings have ee properties', async function () {
                const existingTeamTypeProps = app.defaultTeamType.properties
                existingTeamTypeProps.features.customCatalogs = true
                app.defaultTeamType.properties = existingTeamTypeProps
                await app.defaultTeamType.save()

                const project = await createInstance()
                await project.updateHASettings({
                    replicas: 2
                })
                const newAccessToken = (await project.refreshAuthTokens()).token

                const runtimeSettings = (await app.inject({
                    method: 'GET',
                    url: `/api/v1/projects/${project.id}/settings`,
                    headers: {
                        authorization: `Bearer ${newAccessToken}`
                    }
                })).json()
                runtimeSettings.settings.should.have.property('ha')
                runtimeSettings.settings.ha.should.have.property('replicas', 2)
                runtimeSettings.settings.palette.should.have.property('npmrc', 'example npmrc')
                runtimeSettings.settings.palette.should.have.property('catalogue')
                runtimeSettings.settings.palette.catalogue.should.have.length(1)
                runtimeSettings.settings.palette.catalogue[0].should.equal('https://example.com/catalog')
            })
            it('Check Project Settings do not have TeamType disabled properties', async function () {
                const existingTeamTypeProps = app.defaultTeamType.properties
                existingTeamTypeProps.features.customCatalogs = false
                app.defaultTeamType.properties = existingTeamTypeProps
                await app.defaultTeamType.save()

                const project = await createInstance()
                await project.updateHASettings({
                    replicas: 2
                })
                const newAccessToken = (await project.refreshAuthTokens()).token

                const runtimeSettings = (await app.inject({
                    method: 'GET',
                    url: `/api/v1/projects/${project.id}/settings`,
                    headers: {
                        authorization: `Bearer ${newAccessToken}`
                    }
                })).json()
                runtimeSettings.settings.should.have.property('ha')
                runtimeSettings.settings.ha.should.have.property('replicas', 2)
                runtimeSettings.settings.palette.should.not.have.property('npmrc')
                runtimeSettings.settings.palette.should.not.have.property('catalogue')
            })
            async function setTeamFlags (certifiedNodes, ffNodes) {
                const defaultTeamTypeProperties = app.defaultTeamType.properties
                defaultTeamTypeProperties.features = defaultTeamTypeProperties.features || {}
                defaultTeamTypeProperties.features.certifiedNodes = certifiedNodes
                defaultTeamTypeProperties.features.ffNodes = ffNodes
                app.defaultTeamType.properties = defaultTeamTypeProperties
                await app.defaultTeamType.save()
            }
            it('Should include certified nodes', async function () {
                await app.settings.set('platform:ff-npm-registry:token', 'verySecret')

                await setTeamFlags(true, true)

                const projectName = generateProjectName()
                const response = await app.inject({
                    method: 'POST',
                    url: '/api/v1/projects',
                    payload: {
                        name: projectName,
                        applicationId: TestObjects.ApplicationA.hashid,
                        projectType: TestObjects.projectType1.hashid,
                        template: TestObjects.template1.hashid,
                        stack: TestObjects.stack1.hashid
                    },
                    cookies: { sid: TestObjects.tokens.alice }
                })
                response.statusCode.should.equal(200)
                const result = response.json()

                const newProject = await app.db.models.Project.byId(result.id)
                const newAccessToken = (await newProject.refreshAuthTokens()).token
                const runtimeSettings = (await app.inject({
                    method: 'GET',
                    url: `/api/v1/projects/${newProject.id}/settings`,
                    headers: {
                        authorization: `Bearer ${newAccessToken}`
                    }
                })).json()

                const settings = runtimeSettings.settings
                settings.should.have.property('palette')
                settings.palette.should.have.property('npmrc')
                settings.palette.should.have.property('catalogue')
                settings.palette.catalogue.should.containEql('https://localhost/cert-nodes-catalogue.json')
                settings.palette.catalogue.should.containEql('https://localhost/ff-nodes-catalogue.json')
                settings.palette.should.have.property('npmrc')
                settings.palette.npmrc.should.equal(`@flowfuse-certified-nodes:registry=https://localhost:1234/
//localhost:1234:_auth="verySecret"

@flowfuse-nodes:registry=https://localhost:1234/
//localhost:1234:_auth="verySecret"
`)
            })
        })

        describe('Apply Flow Blueprint', function () {
            let flowBlueprint
            before(async function () {
                const license = 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJGbG93Rm9yZ2UgSW5jLiIsInN1YiI6IkZsb3dGb3JnZSBJbmMuIERldmVsb3BtZW50IiwibmJmIjoxNjYyNTk1MjAwLCJleHAiOjc5ODcwNzUxOTksIm5vdGUiOiJEZXZlbG9wbWVudC1tb2RlIE9ubHkuIE5vdCBmb3IgcHJvZHVjdGlvbiIsInVzZXJzIjoxNTAsInRlYW1zIjo1MCwicHJvamVjdHMiOjUwLCJkZXZpY2VzIjoyLCJkZXYiOnRydWUsImlhdCI6MTY2MjY1MzkyMX0.Tj4fnuDuxi_o5JYltmVi1Xj-BRn0aEjwRPa_fL2MYa9MzSwnvJEd-8bsRM38BQpChjLt-wN-2J21U7oSq2Fp5A'
                await app.close()
                await setupApp({ license })
                flowBlueprint = await app.db.models.FlowTemplate.create({ name: 'Test Blueprint', description: 'This is a test blueprint\\n - with markdown\\n - formatted *description*', category: 'blueprint', active: true, flows: { flows: [{ id: '0959734f594cf1b7', type: 'tab', label: 'Example Flow', disabled: false, info: '', env: [] }, { id: '99a085239a033276', type: 'inject', z: '0959734f594cf1b7', name: '', props: [{ p: 'payload' }, { p: 'topic', vt: 'str' }], repeat: '', crontab: '', once: false, onceDelay: 0.1, topic: '', payload: '', payloadType: 'date', x: 160, y: 100, wires: [['5fbc411997c05334']] }, { id: '5fbc411997c05334', type: 'debug', z: '0959734f594cf1b7', name: 'debug 1', active: true, tosidebar: true, console: false, tostatus: false, complete: 'false', statusVal: '', statusType: 'auto', x: 410, y: 120, wires: [] }] }, modules: { '@flowforge/node-red-dashboard': '0.6.1' } })
            })
            after(async function () {
                // After this set of tests, close the app and recreate (ie remove the license)
                await app.close()
                await setupApp()
            })
            it('Create a project with blueprint', async function () {
                const projectName = generateProjectName()
                const response = await app.inject({
                    method: 'POST',
                    url: '/api/v1/projects',
                    payload: {
                        name: projectName,
                        applicationId: TestObjects.ApplicationA.hashid,
                        projectType: TestObjects.projectType1.hashid,
                        template: TestObjects.template1.hashid,
                        stack: TestObjects.stack1.hashid,
                        flowBlueprintId: flowBlueprint.hashid
                    },
                    cookies: { sid: TestObjects.tokens.alice }
                })
                response.statusCode.should.equal(200)
                const result = response.json()
                // ensure settings includes flowTemplate contents
                const newProject = await app.db.models.Project.byId(result.id)
                const newAccessToken = (await newProject.refreshAuthTokens()).token
                const runtimeSettings = (await app.inject({
                    method: 'GET',
                    url: `/api/v1/projects/${newProject.id}/settings`,
                    headers: {
                        authorization: `Bearer ${newAccessToken}`
                    }
                })).json()
                // should get a copy of the templates palette modules
                runtimeSettings.settings.should.have.property('palette')
                runtimeSettings.settings.palette.should.have.property('modules')
                // Should have modules from the ProjectTemplate and FlowTemplate
                runtimeSettings.settings.palette.modules.should.only.have.keys('node-red-dashboard', 'node-red-contrib-ping', '@flowforge/node-red-dashboard')
                runtimeSettings.settings.palette.modules.should.have.property('node-red-dashboard', '3.0.0')
                runtimeSettings.settings.palette.modules.should.have.property('node-red-contrib-ping', '0.3.0')
                runtimeSettings.settings.palette.modules.should.have.property('@flowforge/node-red-dashboard', '~0.6.1')

                const flowConfig = await getProjectInfo(newProject.id, newAccessToken, 'flows')
                flowConfig.should.have.length(3)
                flowConfig[0].should.have.property('type', 'tab')
                flowConfig[1].should.have.property('type', 'inject')
                flowConfig[2].should.have.property('type', 'debug')
            })

            it('Create a project fails with invalid blueprint', async function () {
                const projectName = generateProjectName()
                const response = await app.inject({
                    method: 'POST',
                    url: '/api/v1/projects',
                    payload: {
                        name: projectName,
                        applicationId: TestObjects.ApplicationA.hashid,
                        projectType: TestObjects.projectType1.hashid,
                        template: TestObjects.template1.hashid,
                        stack: TestObjects.stack1.hashid,
                        flowBlueprintId: 'does-not-exist'
                    },
                    cookies: { sid: TestObjects.tokens.alice }
                })
                response.statusCode.should.equal(400)
                const result = response.json()
                result.should.have.property('code', 'invalid_flow_blueprint')
            })

            it('Create a project fails when blueprint is not available to the team', async function () {
                const bp = await app.db.models.FlowTemplate.create({ name: 'Test Blueprint 2', description: 'This is a test blueprint\\n - with markdown\\n - formatted *description*', teamTypeScope: [], category: 'blueprint', active: true, flows: { flows: [] }, modules: { '@flowforge/node-red-dashboard': '0.6.1' } })

                const projectName = generateProjectName()
                const response = await app.inject({
                    method: 'POST',
                    url: '/api/v1/projects',
                    payload: {
                        name: projectName,
                        applicationId: TestObjects.ApplicationA.hashid,
                        projectType: TestObjects.projectType1.hashid,
                        template: TestObjects.template1.hashid,
                        stack: TestObjects.stack1.hashid,
                        flowBlueprintId: bp.hashid
                    },
                    cookies: { sid: TestObjects.tokens.alice }
                })
                response.statusCode.should.equal(400)
                const result = response.json()
                result.should.have.property('code', 'invalid_flow_blueprint')
                result.should.have.property('error')
                // ensure the error message contains "not allowed for this team"
                result.error.should.match(/not allowed for this team/)
            })

            it('Create a project fails with source-project and flowBlueprintId', async function () {
                const projectName = generateProjectName()
                const response = await app.inject({
                    method: 'POST',
                    url: '/api/v1/projects',
                    payload: {
                        name: projectName,
                        applicationId: TestObjects.ApplicationA.hashid,
                        projectType: TestObjects.projectType1.hashid,
                        template: TestObjects.template1.hashid,
                        stack: TestObjects.stack1.hashid,
                        flowBlueprintId: flowBlueprint.hashid,
                        sourceProject: {
                            id: TestObjects.project1.id,
                            options: {
                                flows: true,
                                credentials: true,
                                envVars: true
                            }
                        }
                    },
                    cookies: { sid: TestObjects.tokens.alice }
                })
                response.statusCode.should.equal(400)
                const result = response.json()
                result.should.have.property('code', 'invalid_request')
            })
        })
    })

    describe('Update Project', function () {
        describe('Change project type', function () {
            it('Changes the type, stack, and restores the project to original state', async function () {
                const project = await createInstance()

                // Create a new project type
                const projectTypeProperties = {
                    name: 'projectType-new',
                    description: 'This is a new project type',
                    active: true,
                    properties: { bar: 'foo' }
                }
                const projectType = await app.db.models.ProjectType.create(projectTypeProperties)

                // Create a new stack
                const stackProperties = {
                    name: 'stack-new',
                    active: true,
                    properties: { nodered: '9.9.9' }
                }
                const stack = await app.db.models.ProjectStack.create(stackProperties)
                await stack.setProjectType(projectType)

                // Put project in running state
                await app.containers.start(project)

                const response = await app.inject({
                    method: 'PUT',
                    url: `/api/v1/projects/${project.id}`,
                    payload: {
                        projectType: projectType.hashid,
                        stack: stack.hashid
                    },
                    cookies: { sid: TestObjects.tokens.alice }
                })

                response.statusCode.should.equal(200)

                // Project is stopped and restarted async
                // Wait for time stub driver takes to stop project
                await sleep(STOP_DELAY)
                await project.reload()

                // Project has been stopped but is presented as "starting"
                project.state.should.equal('suspended')
                (await app.db.controllers.Project.getInflightState(project)).should.equal('starting')

                // Wait for at least start delay as set in stub driver
                await sleep(START_DELAY + 100)

                await project.reload({
                    include: [
                        { model: app.db.models.ProjectType },
                        { model: app.db.models.ProjectStack }
                    ]
                })

                // Project is re-running
                project.state.should.equal('running')
                should(await app.db.controllers.Project.getInflightState(project)).equal(undefined)

                // Type and stack updated
                project.ProjectType.id.should.equal(projectType.id)
                project.ProjectStack.id.should.equal(stack.id)

                const newAccessToken = (await project.refreshAuthTokens()).token
                const runtimeSettings = (await app.inject({
                    method: 'GET',
                    url: `/api/v1/projects/${project.id}/settings`,
                    headers: {
                        authorization: `Bearer ${newAccessToken}`
                    }
                })).json()
                runtimeSettings.should.have.property('state', 'running')
                runtimeSettings.should.have.property('stack', { nodered: '9.9.9' })
            })

            it('Can change only the stack, keeping the project type the same', async function () {
                const project = await createInstance()
                const projectType = project.ProjectType

                // Create a new stack
                const stackProperties = {
                    name: 'stack-new-02',
                    active: true,
                    properties: { nodered: '9.9.8' }
                }
                const stack = await app.db.models.ProjectStack.create(stackProperties)
                await stack.setProjectType(projectType)

                // Put project in running state
                await app.containers.start(project)

                const response = await app.inject({
                    method: 'PUT',
                    url: `/api/v1/projects/${project.id}`,
                    payload: {
                        projectType: projectType.hashid,
                        stack: stack.hashid
                    },
                    cookies: { sid: TestObjects.tokens.alice }
                })

                response.statusCode.should.equal(200)

                // Project is stopped and restarted async
                // Wait for time stub driver takes to stop project
                await sleep(STOP_DELAY)
                await project.reload()

                // Project has been stopped but is presented as "starting"
                project.state.should.equal('suspended')
                (await app.db.controllers.Project.getInflightState(project)).should.equal('starting')

                // Wait for at least start delay as set in stub driver
                await sleep(START_DELAY + 100)

                await project.reload({
                    include: [
                        { model: app.db.models.ProjectType },
                        { model: app.db.models.ProjectStack }
                    ]
                })

                // Project is re-running
                project.state.should.equal('running')
                should(await app.db.controllers.Project.getInflightState(project)).equal(undefined)

                // Stack has been updated
                project.ProjectType.id.should.equal(projectType.id)
                project.ProjectStack.id.should.equal(stack.id)

                const newAccessToken = (await project.refreshAuthTokens()).token
                const runtimeSettings = (await app.inject({
                    method: 'GET',
                    url: `/api/v1/projects/${project.id}/settings`,
                    headers: {
                        authorization: `Bearer ${newAccessToken}`
                    }
                })).json()
                runtimeSettings.should.have.property('state', 'running')
                runtimeSettings.should.have.property('stack', { nodered: '9.9.8' })
            })

            it('Requires the project type to be specified with a stack', async function () {
                const response1 = await app.inject({
                    method: 'PUT',
                    url: `/api/v1/projects/${TestObjects.project1.id}`,
                    payload: {
                        projectType: TestObjects.projectType1.hashid
                    },
                    cookies: { sid: TestObjects.tokens.alice }
                })

                response1.statusCode.should.equal(400)
                response1.json().should.have.property('code', 'invalid_request')
            })

            it('Requires both the type and stack to exist', async function () {
                const response1 = await app.inject({
                    method: 'PUT',
                    url: `/api/v1/projects/${TestObjects.project1.id}`,
                    payload: {
                        projectType: '123',
                        stack: '123'
                    },
                    cookies: { sid: TestObjects.tokens.alice }
                })

                response1.statusCode.should.equal(400)
                response1.json().should.have.property('code', 'invalid_project_type')

                const response2 = await app.inject({
                    method: 'PUT',
                    url: `/api/v1/projects/${TestObjects.project1.id}`,
                    payload: {
                        projectType: TestObjects.projectType1.hashid,
                        stack: '123'
                    },
                    cookies: { sid: TestObjects.tokens.alice }
                })

                response2.statusCode.should.equal(400)
                response2.json().should.have.property('code', 'invalid_stack')
            })

            describe('Legacy set for the first time', function () {
                it('Cannot change project-type if already set', async function () {
                    const projectType = {
                        name: 'projectType2',
                        description: 'default project type',
                        active: true,
                        properties: { foo: 'bar' },
                        order: 2
                    }
                    const projectType2 = await app.db.models.ProjectType.create(projectType)
                    const response = await app.inject({
                        method: 'PUT',
                        url: `/api/v1/projects/${TestObjects.project1.id}`,
                        payload: {
                            projectType: projectType2.hashid
                        },
                        cookies: { sid: TestObjects.tokens.alice }
                    })
                    response.statusCode.should.equal(400)
                })

                it('Cannot set to project-type that does not match existing stack', async function () {
                    const project2 = await app.db.models.Project.create({ name: 'project-legacy-2', type: '', url: '' })
                    await TestObjects.ATeam.addProject(project2)
                    await project2.setProjectStack(TestObjects.stack1)
                    await project2.setProjectTemplate(TestObjects.template1)

                    const projectType = {
                        name: 'projectType2-01',
                        description: 'default project type',
                        active: true,
                        properties: { foo: 'bar' },
                        order: 2
                    }
                    const projectType2 = await app.db.models.ProjectType.create(projectType)

                    const response = await app.inject({
                        method: 'PUT',
                        url: `/api/v1/projects/${project2.id}`,
                        payload: {
                            projectType: projectType2.hashid
                        },
                        cookies: { sid: TestObjects.tokens.alice }
                    })
                    response.statusCode.should.equal(400)
                })

                it('Can change only project-type (without stack) if not set', async function () {
                    const project2 = await app.db.models.Project.create({ name: 'project-legacy-3', type: '', url: '' })
                    await TestObjects.ATeam.addProject(project2)
                    await project2.setProjectStack(TestObjects.stack1)
                    await project2.setProjectTemplate(TestObjects.template1)

                    const response = await app.inject({
                        method: 'PUT',
                        url: `/api/v1/projects/${project2.id}`,
                        payload: {
                            projectType: TestObjects.projectType1.hashid
                        },
                        cookies: { sid: TestObjects.tokens.alice }
                    })
                    response.statusCode.should.equal(200)
                })
            })
        })

        describe('Change project stack', function () {
            it('Updates the stack - suspending and restoring the project along the way', async function () {
                // Setup some flows/credentials
                await addFlowsToProject(app,
                    TestObjects.project1.id,
                    TestObjects.tokens.project,
                    TestObjects.tokens.alice,
                    [{ id: 'node1' }],
                    { testCreds: 'abc' },
                    'key1',
                    {
                        httpAdminRoot: '/test-red',
                        env: [
                            { name: 'one', value: 'a' },
                            { name: 'two', value: 'b' }
                        ]
                    }
                )
                // Duplicate project then update its stack
                // NOTE: Cannot change stack on TestObjects.project1 as it errors
                // when being stopped at `await app.containers.stop(request.project)`
                const newProject = await duplicateProject(
                    TestObjects.project1.id,
                    TestObjects.ATeam.hashid,
                    TestObjects.template1.hashid,
                    TestObjects.stack1.hashid,
                    { flows: false, credentials: false, envVars: false },
                    TestObjects.tokens.alice
                )

                // create another stack
                const stackProperties = {
                    name: 'stack2',
                    active: true,
                    properties: { nodered: '999.998.997' }
                }
                const stack2 = await app.db.models.ProjectStack.create(stackProperties)

                // call "Update a project" with a different stack id
                const response = await app.inject({
                    method: 'PUT',
                    url: `/api/v1/projects/${newProject.id}`,
                    payload: {
                        stack: stack2.hashid
                    },
                    cookies: { sid: TestObjects.tokens.alice }
                })
                response.statusCode.should.equal(200)
                await sleep(STOP_DELAY + START_DELAY + 50) // "Update a project" returns early so it is necessary to wait (stop/start time as set in stub driver)
                const newAccessToken = (await newProject.refreshAuthTokens()).token
                const runtimeSettings = (await app.inject({
                    method: 'GET',
                    url: `/api/v1/projects/${newProject.id}/settings`,
                    headers: {
                        authorization: `Bearer ${newAccessToken}`
                    }
                })).json()
                runtimeSettings.should.have.property('stack', { nodered: '999.998.997' })
            })

            describe('Legacy set for the first time', function () {
                it('Allows changing stack without a project type set', async function () {
                    // A 0.2.0 project that does not have a Stack can have its
                    // stack set.

                    const project = await createInstance()

                    // Setup some flows/credentials
                    await addFlowsToProject(app,
                        project.id,
                        TestObjects.tokens.project,
                        TestObjects.tokens.alice,
                        [{ id: 'node1' }],
                        { testCreds: 'abc' },
                        'key1',
                        {
                            httpAdminRoot: '/test-red',
                            env: [
                                { name: 'one', value: 'a' },
                                { name: 'two', value: 'b' }
                            ]
                        }
                    )
                    // Duplicate project then update its stack
                    // NOTE: Cannot change stack on TestObjects.project1 as it errors
                    // when being stopped at `await app.containers.stop(request.project)`
                    const newProject = await duplicateProject(
                        project.id,
                        TestObjects.ATeam.hashid,
                        TestObjects.template1.hashid,
                        TestObjects.stack1.hashid,
                        { flows: false, credentials: false, envVars: false },
                        TestObjects.tokens.alice
                    )

                    // Delete the stack from the project
                    newProject.ProjectStackId = null
                    await newProject.save()

                    // create another stack
                    const stackProperties = {
                        name: 'stack2-02',
                        active: true,
                        properties: { nodered: '999.998.997' }
                    }
                    const stack2 = await app.db.models.ProjectStack.create(stackProperties)

                    // call "Update a project" with a different stack id
                    const response = await app.inject({
                        method: 'PUT',
                        url: `/api/v1/projects/${newProject.id}`,
                        payload: {
                            stack: stack2.hashid
                        },
                        cookies: { sid: TestObjects.tokens.alice }
                    })
                    response.statusCode.should.equal(200)
                    await sleep(STOP_DELAY + START_DELAY + 50) // "Update a project" returns early so it is necessary to wai (stop/start time as set in stub driver)
                    const newAccessToken = (await newProject.refreshAuthTokens()).token
                    const runtimeSettings = (await app.inject({
                        method: 'GET',
                        url: `/api/v1/projects/${newProject.id}/settings`,
                        headers: {
                            authorization: `Bearer ${newAccessToken}`
                        }
                    })).json()
                    runtimeSettings.should.have.property('stack', { nodered: '999.998.997' })
                })
            })
        })
        describe('Change project name', function () {
            it('Updates the name', async function () {
                // Setup some flows/credentials
                await addFlowsToProject(app,
                    TestObjects.project1.id,
                    TestObjects.tokens.project,
                    TestObjects.tokens.alice,
                    [{ id: 'node1' }],
                    { testCreds: 'abc' },
                    'key1',
                    {}
                )
                TestObjects.project1.state = 'suspended'
                await TestObjects.project1.save()

                // call "Update a project" with a new name
                const response = await app.inject({
                    method: 'PUT',
                    url: `/api/v1/projects/${TestObjects.project1.id}`,
                    payload: {
                        name: 'new project name'
                    },
                    cookies: { sid: TestObjects.tokens.alice }
                })
                response.statusCode.should.equal(200)
                await sleep(STOP_DELAY + START_DELAY + 50)
                const newResponse = await app.inject({
                    method: 'GET',
                    url: `/api/v1/projects/${TestObjects.project1.id}`,
                    cookies: { sid: TestObjects.tokens.alice }
                })
                JSON.parse(newResponse.payload).should.have.property('name', 'new project name')
            })

            it('Updates the name fail for running instance', async function () {
                // Setup some flows/credentials
                await addFlowsToProject(app,
                    TestObjects.project1.id,
                    TestObjects.tokens.project,
                    TestObjects.tokens.alice,
                    [{ id: 'node1' }],
                    { testCreds: 'abc' },
                    'key1',
                    {}
                )

                TestObjects.project1.name = 'project1'
                await TestObjects.project1.save()
                TestObjects.project1.state = 'running'
                await TestObjects.project1.save()

                // call "Update a project" with a new name
                const response = await app.inject({
                    method: 'PUT',
                    url: `/api/v1/projects/${TestObjects.project1.id}`,
                    payload: {
                        name: 'new project name'
                    },
                    cookies: { sid: TestObjects.tokens.alice }
                })
                response.statusCode.should.equal(200)
                JSON.parse(response.payload).should.have.property('name', 'new project name')
            })

            it('Non-owner cannot change project name', async function () {
            // call "Update a project" with a new name
                const response = await app.inject({
                    method: 'PUT',
                    url: `/api/v1/projects/${TestObjects.project1.id}`,
                    payload: {
                        name: 'new project name'
                    },
                    cookies: { sid: TestObjects.tokens.bob }
                })
                response.statusCode.should.equal(403)
            })
        })

        it('Change 1 project setting', async function () {
            // Setup some flows/credentials
            await addFlowsToProject(app,
                TestObjects.project1.id,
                TestObjects.tokens.project,
                TestObjects.tokens.alice,
                [{ id: 'node1' }],
                { testCreds: 'abc' },
                'key1',
                {
                    httpAdminRoot: '/test-red',
                    codeEditor: 'monaco',
                    env: [
                        { name: 'one', value: 'a' },
                        { name: 'two', value: 'b' }
                    ]
                }
            )
            // call "Update a project" with new httpAdminRoot
            const response = await app.inject({
                method: 'PUT',
                url: `/api/v1/projects/${TestObjects.project1.id}`,
                payload: {
                    settings: {
                        codeEditor: 'ace'
                    }
                },
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(200)

            const newSettings = await TestObjects.project1.getSetting('settings')
            newSettings.should.have.property('codeEditor', 'ace') // should be changed
            newSettings.should.have.property('httpAdminRoot', '/test-red') // should be unchanged
            newSettings.should.have.property('env', [
                { name: 'one', value: 'a' },
                { name: 'two', value: 'b' }
            ]) // should be unchanged
        })

        it('Non-owner cannot change project settings', async function () {
            const response = await app.inject({
                method: 'PUT',
                url: `/api/v1/projects/${TestObjects.project1.id}`,
                payload: {
                    settings: {
                        codeEditor: 'ace'
                    }
                },
                cookies: { sid: TestObjects.tokens.bob }
            })
            response.statusCode.should.equal(403)
        })

        it('Change project env vars - owner', async function () {
            // Setup some flows/credentials
            await addFlowsToProject(app,
                TestObjects.project1.id,
                TestObjects.tokens.project,
                TestObjects.tokens.alice,
                [{ id: 'node1' }],
                { testCreds: 'abc' },
                'key1',
                {
                    httpAdminRoot: '/test-red',
                    codeEditor: 'monaco',
                    env: [
                        { name: 'one', value: 'a' },
                        { name: 'two', value: 'b' },
                        { name: 'three', value: 'c', hidden: true }
                    ]
                }
            )
            // call "Update a project" with new httpAdminRoot
            const response = await app.inject({
                method: 'PUT',
                url: `/api/v1/projects/${TestObjects.project1.id}`,
                payload: {
                    settings: {
                        env: [
                            { name: 'one', value: '1' },
                            { name: 'two', value: '2' },
                            { name: 'three', value: '3', hidden: true }
                        ]
                    }
                },
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(200)

            const newSettings = await TestObjects.project1.getSetting('settings')
            newSettings.should.have.property('codeEditor', 'monaco') // should be unchanged
            newSettings.should.have.property('httpAdminRoot', '/test-red') // should be unchanged
            newSettings.should.have.property('env', [
                { name: 'one', value: '1' },
                { name: 'two', value: '2' },
                { name: 'three', value: '3', hidden: true }
            ]) // should be unchanged
        })
        it('Change project env vars - member', async function () {
            // Setup some flows/credentials
            await addFlowsToProject(app,
                TestObjects.project1.id,
                TestObjects.tokens.project,
                TestObjects.tokens.alice,
                [{ id: 'node1' }],
                { testCreds: 'abc' },
                'key1',
                {
                    httpAdminRoot: '/test-red',
                    codeEditor: 'monaco',
                    env: [
                        { name: 'one', value: 'a' },
                        { name: 'two', value: 'b' }
                    ]
                }
            )
            // call "Update a project" with new httpAdminRoot
            const response = await app.inject({
                method: 'PUT',
                url: `/api/v1/projects/${TestObjects.project1.id}`,
                payload: {
                    settings: {
                        env: [
                            { name: 'one', value: '1' },
                            { name: 'two', value: '2' }
                        ]
                    }
                },
                cookies: { sid: TestObjects.tokens.bob }
            })
            response.statusCode.should.equal(200)

            const newSettings = await TestObjects.project1.getSetting('settings')
            newSettings.should.have.property('codeEditor', 'monaco') // should be unchanged
            newSettings.should.have.property('httpAdminRoot', '/test-red') // should be unchanged
            newSettings.should.have.property('env', [
                { name: 'one', value: '1' },
                { name: 'two', value: '2' }
            ]) // should be unchanged
        })
        it('Change launcher settings - owner', async function () {
            // Setup some flows/credentials
            await addFlowsToProject(app,
                TestObjects.project1.id,
                TestObjects.tokens.project,
                TestObjects.tokens.alice,
                [{ id: 'node1' }],
                { testCreds: 'abc' },
                'key1',
                {}
            )
            // call "Update a project" with new httpAdminRoot
            const response = await app.inject({
                method: 'PUT',
                url: `/api/v1/projects/${TestObjects.project1.id}`,
                payload: {
                    launcherSettings: {
                        healthCheckInterval: 9876,
                        disableAutoSafeMode: true
                    }
                },
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(200)

            const healthValue = await TestObjects.project1.getSetting(KEY_HEALTH_CHECK_INTERVAL)
            should(healthValue).equal(9876)
            const safeModeValue = await TestObjects.project1.getSetting(KEY_DISABLE_AUTO_SAFE_MODE)
            should(safeModeValue).equal(true)
        })
        it('Change launcher health check interval bad value - owner', async function () {
            // Setup some flows/credentials
            await addFlowsToProject(app,
                TestObjects.project1.id,
                TestObjects.tokens.project,
                TestObjects.tokens.alice,
                [{ id: 'node1' }],
                { testCreds: 'abc' },
                'key1',
                {}
            )
            // call "Update a project" with new httpAdminRoot
            const response = await app.inject({
                method: 'PUT',
                url: `/api/v1/projects/${TestObjects.project1.id}`,
                payload: {
                    launcherSettings: {
                        healthCheckInterval: 999 // 999 is below the 5000 is the minimum
                    }
                },
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(400)
            const result = response.json()
            result.should.have.property('code', 'invalid_heathCheckInterval')
        })
        it('Change launcher health check interval - member', async function () {
            // Setup some flows/credentials
            // app, id, token, userToken, flows, creds, key, settings
            await addFlowsToProject(
                app,
                TestObjects.project1.id,
                TestObjects.tokens.project,
                TestObjects.tokens.alice,
                [{ id: 'node1' }],
                { testCreds: 'abc' },
                'key1',
                {}
            )
            // call "Update a project" with new httpAdminRoot
            const response = await app.inject({
                method: 'PUT',
                url: `/api/v1/projects/${TestObjects.project1.id}`,
                payload: {
                    launcherSettings: {
                        healthCheckInterval: 9876
                    }
                },
                cookies: { sid: TestObjects.tokens.bob }
            })
            response.statusCode.should.equal(403)
        })

        it('Export to another project - includes everything ', async function () {
            // Setup some flows/credentials
            await addFlowsToProject(app,
                TestObjects.project1.id,
                TestObjects.tokens.project,
                TestObjects.tokens.alice,
                [{ id: 'node1' }],
                { testCreds: 'abc' },
                'key1',
                {
                    httpAdminRoot: '/test-red',
                    dashboardUI: '/test-dash',
                    env: [
                        { name: 'src_only', value: 'src value' }, // this should be copied to target
                        { name: 'in_both', value: 'src common' } // this should be superseded by existing env var in target
                    ]
                }
            )
            const responseCopiedProject = await app.inject({
                method: 'POST',
                url: '/api/v1/projects',
                payload: {
                    name: 'project2',
                    applicationId: TestObjects.ApplicationA.hashid,
                    projectType: TestObjects.projectType1.hashid,
                    template: TestObjects.template1.hashid,
                    stack: TestObjects.stack1.hashid,
                    sourceProject: {
                        id: TestObjects.project1.id,
                        options: {
                            flows: false,
                            credentials: false,
                            envVars: false
                        }
                    }
                },
                cookies: { sid: TestObjects.tokens.alice }
            })
            const newProject = await app.db.models.Project.byId(responseCopiedProject.json().id)

            // add some different env vars to the copied project
            const newSettings = await newProject.getSetting('settings') || { env: [] }
            newSettings.env.push(
                { name: 'trg_only', value: 'trg value' }, // this value should be kept
                { name: 'in_both', value: 'trg common' } // this value should be kept
            )
            await newProject.updateSetting('settings', newSettings)

            const response = await app.inject({
                method: 'PUT',
                url: `/api/v1/projects/${newProject.id}`,
                payload: {
                    sourceProject: {
                        id: TestObjects.project1.id,
                        options: {
                            flows: true,
                            credentials: true,
                            envVars: true,
                            template: true,
                            settings: true
                        }
                    }
                },
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(200)
            await sleep(STOP_DELAY + START_DELAY + 50) // "Update a project" returns early so it is necessary to wait (stop/start time as set in stub driver)

            const newAccessToken = (await newProject.refreshAuthTokens()).token
            const newFlows = await getProjectInfo(newProject.id, newAccessToken, 'flows')
            newFlows.should.have.length(1)
            newFlows[0].should.have.property('id', 'node1')

            const newCreds = await getProjectInfo(newProject.id, newAccessToken, 'credentials')
            newCreds.should.have.property('$')
            const credSecret = await newProject.getSetting('credentialSecret')
            should(credSecret).be.type('string', 'credentialSecret should be an auto generated string')
            should(credSecret.length).be.Number().eql(64, 'credentialSecret should be a string of 64 characters')
            const newKey = crypto.createHash('sha256').update(credSecret).digest()
            const decrypted = decryptCreds(newKey, newCreds)
            decrypted.should.have.property('testCreds', 'abc')

            const runtimeSettings = (await app.inject({
                method: 'GET',
                url: `/api/v1/projects/${newProject.id}/settings`,
                headers: {
                    authorization: `Bearer ${newAccessToken}`
                }
            })).json()
            runtimeSettings.should.have.property('settings')
            runtimeSettings.settings.should.not.have.property('credentialSecret')
            runtimeSettings.should.not.have.property('_credentialSecret')
            runtimeSettings.settings.should.have.property('httpAdminRoot', '/test-red')
            runtimeSettings.settings.should.have.property('dashboardUI', '/test-dash')
            runtimeSettings.should.have.property('env')
            runtimeSettings.env.should.have.property('src_only', 'src value') // key only copied
            runtimeSettings.env.should.have.property('trg_only', 'trg value') // original value kept
            runtimeSettings.env.should.have.property('in_both', 'trg common') // original value kept
        })

        it('Export to another project - env-var keys only', async function () {
            // Setup some flows/credentials
            await addFlowsToProject(app,
                TestObjects.project1.id,
                TestObjects.tokens.project,
                TestObjects.tokens.alice,
                [{ id: 'node1' }],
                { testCreds: 'abc' },
                'key1',
                {
                    httpAdminRoot: '/test-red',
                    env: [
                        { name: 'src_only', value: 'src value' }, // only key should be copied
                        { name: 'in_both', value: 'src common' } // this should be superseded by existing env var in target
                    ]
                }
            )
            const newProject = await duplicateProject(
                TestObjects.project1.id,
                TestObjects.ATeam.hashid,
                TestObjects.template1.hashid,
                TestObjects.stack1.hashid,
                { flows: false, credentials: false, envVars: false },
                TestObjects.tokens.alice
            )

            // add some different env vars to the copied project
            const newSettings = await newProject.getSetting('settings') || { env: [] }
            newSettings.env.push(
                { name: 'trg_only', value: 'trg value' }, // this value should be kept
                { name: 'in_both', value: 'trg common' } // this value should be kept
            )
            await newProject.updateSetting('settings', newSettings)

            // export env-var keys only from TestObjects.project1 to newProject
            const response = await app.inject({
                method: 'PUT',
                url: `/api/v1/projects/${newProject.id}`,
                payload: {
                    sourceProject: {
                        id: TestObjects.project1.id,
                        options: {
                            flows: false,
                            credentials: false,
                            envVars: 'keys'
                        }
                    }
                },
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(200)
            await sleep(STOP_DELAY + START_DELAY + 50) // "Update a project" returns early so it is necessary to wait (stop/start time as set in stub driver)
            const newAccessToken = (await newProject.refreshAuthTokens()).token
            const runtimeSettings = (await app.inject({
                method: 'GET',
                url: `/api/v1/projects/${newProject.id}/settings`,
                headers: {
                    authorization: `Bearer ${newAccessToken}`
                }
            })).json()
            runtimeSettings.should.have.property('settings')
            runtimeSettings.settings.should.not.have.property('credentialSecret')
            runtimeSettings.should.not.have.property('_credentialSecret')
            runtimeSettings.should.have.property('env')
            runtimeSettings.env.should.have.property('src_only', '') // key only copied
            runtimeSettings.env.should.have.property('trg_only', 'trg value') // original value kept
            runtimeSettings.env.should.have.property('in_both', 'trg common') // original value kept
        })

        it('Export to another project - no env-vars', async function () {
            // Setup some flows/credentials
            await addFlowsToProject(app,
                TestObjects.project1.id,
                TestObjects.tokens.project,
                TestObjects.tokens.alice,
                [{ id: 'node1' }],
                { testCreds: 'abc' },
                'key1',
                {
                    httpAdminRoot: '/test-red',
                    env: [
                        { name: 'one', value: 'a' },
                        { name: 'two', value: 'b' }
                    ]
                }
            )
            const newProject = await duplicateProject(
                TestObjects.project1.id,
                TestObjects.ATeam.hashid,
                TestObjects.template1.hashid,
                TestObjects.stack1.hashid,
                { flows: false, credentials: false, envVars: false },
                TestObjects.tokens.alice
            )

            // add some env vars to copied project for later testing
            const newSettings = await newProject.getSetting('settings') || { env: [] }
            newSettings.env.push({
                name: 'two',
                value: '2'
            }, {
                name: 'three',
                value: '3'
            })
            await newProject.updateSetting('settings', newSettings)

            // export without env-vars from TestObjects.project1 to newProject
            const response = await app.inject({
                method: 'PUT',
                url: `/api/v1/projects/${newProject.id}`,
                payload: {
                    sourceProject: {
                        id: TestObjects.project1.id,
                        options: {
                            flows: true,
                            credentials: true,
                            envVars: false
                        }
                    }
                },
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(200)
            await sleep(STOP_DELAY + START_DELAY + 50) // "Update a project" returns early so it is necessary to wait (stop/start time as set in stub driver)
            const newAccessToken = (await newProject.refreshAuthTokens()).token
            const runtimeSettings = (await app.inject({
                method: 'GET',
                url: `/api/v1/projects/${newProject.id}/settings`,
                headers: {
                    authorization: `Bearer ${newAccessToken}`
                }
            })).json()
            runtimeSettings.should.have.property('settings')
            runtimeSettings.settings.should.not.have.property('credentialSecret')
            runtimeSettings.should.not.have.property('_credentialSecret')
            runtimeSettings.should.have.property('env')
            // runtimeSettings.env.should.have.property('length', 0)
            runtimeSettings.env.should.not.have.property('one') // source proj env, prop one should NOT be copied
            runtimeSettings.env.should.have.property('two', '2') // newProject added env var should remain
            runtimeSettings.env.should.have.property('three', '3') // newProject added env var should remain
        })

        it('Export to another project - no credentials', async function () {
            // Setup some flows/credentials
            await addFlowsToProject(app,
                TestObjects.project1.id,
                TestObjects.tokens.project,
                TestObjects.tokens.alice,
                [{ id: 'node1' }],
                { testCreds: 'abc' },
                'key1',
                {
                    httpAdminRoot: '/test-red',
                    env: [
                        { name: 'one', value: 'a' },
                        { name: 'two', value: 'b' }
                    ]
                }
            )
            const newProject = await duplicateProject(
                TestObjects.project1.id,
                TestObjects.ATeam.hashid,
                TestObjects.template1.hashid,
                TestObjects.stack1.hashid,
                { flows: false, credentials: false, envVars: false },
                TestObjects.tokens.alice
            )
            // export without credentials from TestObjects.project1 to newProject
            const response = await app.inject({
                method: 'PUT',
                url: `/api/v1/projects/${newProject.id}`,
                payload: {
                    sourceProject: {
                        id: TestObjects.project1.id,
                        options: {
                            flows: true,
                            credentials: false,
                            envVars: true
                        }
                    }
                },
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(200)
            await sleep(STOP_DELAY + START_DELAY + 50) // "Update a project" returns early so it is necessary to wait (stop/start time as set in stub driver)
            const newAccessToken = (await newProject.refreshAuthTokens()).token
            const newCreds = await getProjectInfo(newProject.id, newAccessToken, 'credentials')
            Object.keys(newCreds).should.have.length(0)
        })
        it('Export to another project - no flows/creds', async function () {
            // Setup some flows/credentials
            await addFlowsToProject(app,
                TestObjects.project1.id,
                TestObjects.tokens.project,
                TestObjects.tokens.alice,
                [{ id: 'node1' }],
                { testCreds: 'abc' },
                'key1',
                {
                    httpAdminRoot: '/test-red',
                    env: [
                        { name: 'one', value: 'a' },
                        { name: 'two', value: 'b' }
                    ]
                }
            )
            const newProject = await duplicateProject(
                TestObjects.project1.id,
                TestObjects.ATeam.hashid,
                TestObjects.template1.hashid,
                TestObjects.stack1.hashid,
                { flows: false, credentials: false, envVars: false },
                TestObjects.tokens.alice
            )

            // export no flows/creds from TestObjects.project1 to newProject
            const response = await app.inject({
                method: 'PUT',
                url: `/api/v1/projects/${newProject.id}`,
                payload: {
                    sourceProject: {
                        id: TestObjects.project1.id,
                        options: {
                            flows: false,
                            credentials: false,
                            envVars: true
                        }
                    }
                },
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(200)
            await sleep(STOP_DELAY + START_DELAY + 50) // "Update a project" returns early so it is necessary to wait (stop/start time as set in stub driver)
            const newAccessToken = (await newProject.refreshAuthTokens()).token
            // Flows should be empty
            const newFlows = await getProjectInfo(newProject.id, newAccessToken, 'flows')
            newFlows.should.have.length(0)
            // Creds should be empty
            const newCreds = await getProjectInfo(newProject.id, newAccessToken, 'credentials')
            Object.keys(newCreds).should.have.length(0)
        })
    })

    describe('Delete Instance', function () {
        it('Non-member cannot delete instance', async function () {
            const aTeamInstance = await createInstance()

            // Chris (non-member) cannot delete in ATeam
            const response = await app.inject({
                method: 'DELETE',
                url: `/api/v1/projects/${aTeamInstance.id}`, // ATeam Project
                cookies: { sid: TestObjects.tokens.chris }
            })
            response.statusCode.should.equal(404)
        })

        it('Non-owner member cannot delete instance', async function () {
            const aTeamInstance = await createInstance()

            // Bob (non-owner) can delete in ATeam
            const response = await app.inject({
                method: 'DELETE',
                url: `/api/v1/projects/${aTeamInstance.id}`,
                cookies: { sid: TestObjects.tokens.bob }
            })

            const result = response.json()
            result.should.have.property('code', 'unauthorized')

            response.statusCode.should.equal(403)
        })

        it('Owner can delete an instance', async function () {
            const aTeamInstance = await createInstance({ start: true })

            const response = await app.inject({
                method: 'DELETE',
                url: `/api/v1/projects/${aTeamInstance.id}`,
                cookies: { sid: TestObjects.tokens.alice }
            })

            const result = response.json()
            result.should.have.property('status', 'okay')

            response.statusCode.should.equal(200)
        })

        it('Handles trying to delete an already deleted container without error', async function () {
            const aTeamInstance = await createInstance({ start: true })

            sinon.stub(app.containers, 'remove').throws({ statusCode: 404, message: 'container not found' })

            const response = await app.inject({
                method: 'DELETE',
                url: `/api/v1/projects/${aTeamInstance.id}`,
                cookies: { sid: TestObjects.tokens.alice }
            })

            const result = response.json()
            result.should.have.property('status', 'okay')

            response.statusCode.should.equal(200)
        })
    })

    describe('Project Settings', function () {
        // helper function to get settings
        const getSettings = async () => {
            const settingsURL = `/api/v1/projects/${app.project.id}/settings`
            const response = await app.inject({
                method: 'GET',
                url: settingsURL,
                headers: {
                    authorization: `Bearer ${TestObjects.tokens.project}`
                }
            })
            response.statusCode.should.equal(200)
            return response.json()
        }
        it('Project token can get project Settings', async function () {
            const newSettings = await getSettings()
            should(newSettings).have.property('storageURL')
            should(newSettings).have.property('forgeURL')
        })

        it('User cannot get project settings', async function () {
            const settingsURL = `/api/v1/projects/${app.project.id}/settings`
            const response = await app.inject({
                method: 'GET',
                url: settingsURL,
                cookies: { sid: TestObjects.tokens.alice }
            })
            should(response).have.property('statusCode')
            should(response.statusCode).eqls(401)
        })

        it('Project token cannot get another project settings', async function () {
            const settingsURL = `/api/v1/projects/${app.project.id}/settings`

            const project2 = await app.db.models.Project.create({ name: generateProjectName(), type: '', url: '' })
            await app.team.addProject(project2)
            const tokens2 = await project2.refreshAuthTokens()
            const response = await app.inject({
                method: 'GET',
                url: settingsURL,
                headers: {
                    authorization: `Bearer ${tokens2.token}`
                }
            })
            should(response).have.property('statusCode')
            should(response.statusCode).eqls(404)
        })

        it('Editor theme selection can be changed', async function () {
            // GET current settings
            const { settings: settingsBefore } = await getSettings()
            settingsBefore.should.not.have.property('theme', 'forge-dark')

            // PUT new theme value
            const response = await app.inject({
                method: 'PUT',
                url: `/api/v1/projects/${TestObjects.project1.id}`,
                payload: {
                    settings: {
                        theme: 'forge-dark'
                    }
                },
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(200)

            // GET new settings & check theme value
            const { settings: settingsAfter } = await getSettings()
            settingsAfter.should.have.property('theme', 'forge-dark') // should now be forge-dark
        })

        it('Dashboard URL is provided in the instance.settings if flowfuse dashboard is installed', async function () {
            // GET instance
            const response1 = await app.inject({
                method: 'GET',
                url: `/api/v1/projects/${app.project.id}`,
                cookies: { sid: TestObjects.tokens.alice }
            })
            const data1 = response1.json()
            data1.should.have.property('settings')
            data1.settings.should.not.have.property('dashboard2UI')

            // Update project settings to add flowfuse dashboard
            const response2 = await app.inject({
                method: 'PUT',
                url: `/api/v1/projects/${app.project.id}`,
                payload: {
                    settings: {
                        palette: {
                            modules: [
                                { name: '@flowfuse/node-red-dashboard', version: '~1.5.1', local: true }
                            ]
                        }
                    }
                },
                cookies: { sid: TestObjects.tokens.alice }
            })
            response2.statusCode.should.equal(200)

            // GET new settings & check dashboard2UI is now populated
            const response3 = await app.inject({
                method: 'GET',
                url: `/api/v1/projects/${app.project.id}`,
                cookies: { sid: TestObjects.tokens.alice }
            })
            const data3 = response3.json()
            data3.should.have.property('settings')
            data3.settings.should.have.property('dashboard2UI')
        })
        describe('Assistant Settings', function () {
            // these tests are run with a clean app since they change the app config
            beforeEach(async function () {
                // Close down the default app
                if (app) {
                    await app.close()
                }
                app = null
            })
            after(async function () {
                // Once all done, create the clean app for later tests
                await app.close()
                await setupApp()
            })

            it('assistant can be disabled', async function () {
                app = await setup({
                    assistant: {
                        enabled: false,
                        mcp: { enabled: false },
                        completions: { enabled: false }
                    }
                })

                await login('alice', 'aaPassword')
                TestObjects.tokens.project = (await app.project.refreshAuthTokens()).token

                const body = await getSettings()
                body.should.have.property('assistant').and.be.an.Object()
                body.assistant.should.have.property('enabled', false)
                body.assistant.should.have.property('mcp').and.be.an.Object()
                body.assistant.mcp.should.have.property('enabled', false)
                body.assistant.should.have.property('completions').and.be.an.Object()
                body.assistant.completions.should.have.property('enabled', false)
                body.assistant.completions.should.have.property('inlineEnabled', false)
            })
            it('instance settings including assistant completions settings by default', async function () {
                app = await setup({
                    license: 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJGbG93Rm9yZ2UgSW5jLiIsInN1YiI6IkZsb3dGb3JnZSBJbmMuIERldmVsb3BtZW50IiwibmJmIjoxNjYyNTk1MjAwLCJleHAiOjc5ODcwNzUxOTksIm5vdGUiOiJEZXZlbG9wbWVudC1tb2RlIE9ubHkuIE5vdCBmb3IgcHJvZHVjdGlvbiIsInVzZXJzIjoxNTAsInRlYW1zIjo1MCwicHJvamVjdHMiOjUwLCJkZXZpY2VzIjoyLCJkZXYiOnRydWUsImlhdCI6MTY2MjY1MzkyMX0.Tj4fnuDuxi_o5JYltmVi1Xj-BRn0aEjwRPa_fL2MYa9MzSwnvJEd-8bsRM38BQpChjLt-wN-2J21U7oSq2Fp5A',
                    assistant: {
                        enabled: true,
                        requestTimeout: 12345
                        // mcp deliberately excluded to check it defaults to enabled
                        // completions deliberately excluded to check it defaults to enabled
                    }
                })

                await login('alice', 'aaPassword')
                TestObjects.tokens.project = (await app.project.refreshAuthTokens()).token

                const body = await getSettings(app.project)
                body.should.have.property('assistant').and.be.an.Object()
                body.assistant.should.have.property('enabled', true)
                body.assistant.should.have.property('mcp').and.be.an.Object()
                body.assistant.mcp.should.have.property('enabled', true) // defaults to enabled
                body.assistant.should.have.property('completions').and.be.an.Object()
                body.assistant.completions.should.have.property('enabled', true) // defaults to enabled
                body.assistant.completions.should.have.property('inlineEnabled', false) // disabled by default (enabled via feature flag assistantInlineCompletions)
            })
            it('instance settings including assistant inline completions settings enabled', async function () {
                app = await setup({
                    license: 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJGbG93Rm9yZ2UgSW5jLiIsInN1YiI6IkZsb3dGb3JnZSBJbmMuIERldmVsb3BtZW50IiwibmJmIjoxNjYyNTk1MjAwLCJleHAiOjc5ODcwNzUxOTksIm5vdGUiOiJEZXZlbG9wbWVudC1tb2RlIE9ubHkuIE5vdCBmb3IgcHJvZHVjdGlvbiIsInVzZXJzIjoxNTAsInRlYW1zIjo1MCwicHJvamVjdHMiOjUwLCJkZXZpY2VzIjoyLCJkZXYiOnRydWUsImlhdCI6MTY2MjY1MzkyMX0.Tj4fnuDuxi_o5JYltmVi1Xj-BRn0aEjwRPa_fL2MYa9MzSwnvJEd-8bsRM38BQpChjLt-wN-2J21U7oSq2Fp5A',
                    assistant: {
                        enabled: true,
                        requestTimeout: 12345
                        // mcp deliberately excluded to check it defaults to enabled
                        // completions deliberately excluded to check it defaults to enabled
                    }
                })

                // enable feature flag for the team
                await enableTeamTypeFeatureFlag(app, true, 'assistantInlineCompletions')

                await login('alice', 'aaPassword')
                TestObjects.tokens.project = (await app.project.refreshAuthTokens()).token

                const body = await getSettings(app.project)
                body.should.have.property('assistant').and.be.an.Object()
                body.assistant.should.have.property('enabled', true)
                body.assistant.should.have.property('mcp').and.be.an.Object()
                body.assistant.mcp.should.have.property('enabled', true) // defaults to enabled
                body.assistant.should.have.property('completions').and.be.an.Object()
                body.assistant.completions.should.have.property('enabled', true) // defaults to enabled
                body.assistant.completions.should.have.property('inlineEnabled', true) // enabled due to tier/licensed
            })
        })
    })

    describe('Project import flows & credentials', function () {
        const flows = [
            {
                id: 'adc4e3930e0a9071',
                type: 'tab',
                label: 'Flow 1',
                disabled: false,
                info: '',
                env: []
            },
            {
                id: '7ecba32db86f0617',
                type: 'tab',
                label: 'Flow 1',
                disabled: false,
                info: '',
                env: []
            },
            {
                id: 'e7ece99c22e84b1c',
                type: 'inject',
                z: 'adc4e3930e0a9071',
                name: '',
                props: [
                    {
                        p: 'payload'
                    },
                    {
                        p: 'topic',
                        vt: 'str'
                    }
                ],
                repeat: '',
                crontab: '',
                once: false,
                onceDelay: 0.1,
                topic: '',
                payload: '',
                payloadType: 'date',
                x: 140,
                y: 60,
                wires: [
                    [
                        '5c5d940e2575e2a4'
                    ]
                ]
            },
            {
                id: '5c5d940e2575e2a4',
                type: 'http request',
                z: 'adc4e3930e0a9071',
                name: '',
                method: 'GET',
                ret: 'txt',
                paytoqs: 'ignore',
                url: 'http://localhost:1880/test',
                tls: '',
                persist: false,
                proxy: '',
                authType: 'basic',
                senderr: false,
                x: 290,
                y: 60,
                wires: [
                    [
                        '189e5eb3435b642b'
                    ]
                ]
            },
            {
                id: '54636a79a0f39563',
                type: 'http in',
                z: 'adc4e3930e0a9071',
                name: '',
                url: '/test',
                method: 'get',
                upload: false,
                swaggerDoc: '',
                x: 140,
                y: 120,
                wires: [
                    [
                        'fc887a9eadc0ba23'
                    ]
                ]
            },
            {
                id: 'd25b24804605b738',
                type: 'http response',
                z: 'adc4e3930e0a9071',
                name: '',
                statusCode: '',
                headers: {},
                x: 410,
                y: 120,
                wires: []
            },
            {
                id: '189e5eb3435b642b',
                type: 'debug',
                z: 'adc4e3930e0a9071',
                name: '',
                active: true,
                tosidebar: true,
                console: false,
                tostatus: false,
                complete: 'false',
                statusVal: '',
                statusType: 'auto',
                x: 450,
                y: 60,
                wires: []
            },
            {
                id: 'fc887a9eadc0ba23',
                type: 'function',
                z: 'adc4e3930e0a9071',
                name: '',
                func: "var auth;\nfor (var i=0; i<msg.req.rawHeaders.length; i++) {\n    if (msg.req.rawHeaders[i] === 'Authorization') {\n        auth = msg.req.rawHeaders[i+1].split(' ')[1]\n        break;\n    }\n}\nmsg.payload = Buffer.from(auth, 'base64').toString('utf8')\nreturn msg;",
                outputs: 1,
                noerr: 0,
                initialize: '',
                finalize: '',
                libs: [],
                x: 280,
                y: 120,
                wires: [
                    [
                        'd25b24804605b738'
                    ]
                ]
            },
            {
                id: '480ee2eb1cc81556',
                type: 'http request',
                z: '7ecba32db86f0617',
                name: '',
                method: 'GET',
                ret: 'txt',
                paytoqs: 'ignore',
                url: 'https://jigsaw.w3.org/HTTP/Digest/',
                tls: '',
                persist: false,
                proxy: '',
                authType: 'digest',
                senderr: false,
                x: 330,
                y: 140,
                wires: [
                    [
                        '0ccbdebc64bd4ff2'
                    ]
                ]
            },
            {
                id: '77c84803d42d4f9e',
                type: 'inject',
                z: '7ecba32db86f0617',
                name: '',
                props: [
                    {
                        p: 'payload'
                    },
                    {
                        p: 'topic',
                        vt: 'str'
                    }
                ],
                repeat: '',
                crontab: '',
                once: false,
                onceDelay: 0.1,
                topic: '',
                payload: '',
                payloadType: 'date',
                x: 180,
                y: 140,
                wires: [
                    [
                        '480ee2eb1cc81556'
                    ]
                ]
            },
            {
                id: '0ccbdebc64bd4ff2',
                type: 'debug',
                z: '7ecba32db86f0617',
                name: '',
                active: true,
                tosidebar: true,
                console: false,
                tostatus: false,
                complete: 'true',
                targetType: 'full',
                statusVal: '',
                statusType: 'auto',
                x: 470,
                y: 140,
                wires: []
            }
        ]
        const credentials = {
            $: '00fd012ce6da285e6f0fd83e7360afebP/e6OeYPMqTUPXO7L+9e3SUgvJ9NaoCtZbUPme8Y4GMbep8oQzZd64r3J4i1BVvxR5mBZD3kst++ke3114qhm/MmmxyT6V0mogRB0d7z/AapbjnVliXdvE4vGO1tsSHnYa4uf5k//STkK90='
        }
        const credsSecret = 'd8bc017ef274d0418725b23d86cdf7a65f8e3699340dd6b65e26600719ad2ac6'

        it('Import Flow', async function () {
            const importURL = `/api/v1/projects/${app.project.id}/import`
            flows[0].label += 'a'
            const response = await app.inject({
                method: 'POST',
                url: importURL,
                body: {
                    flows: JSON.stringify(flows)
                },
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.should.have.property('statusCode')
            response.statusCode.should.eqls(200)
            const savedFlow = await app.db.models.StorageFlow.byProject(app.project.id)
            savedFlow.flow.should.eqls(JSON.stringify(flows))
        })

        it('Import Credentials', async function () {
            await app.project.updateSetting('credentialSecret', crypto.randomBytes(32).toString('hex'))
            const importURL = `/api/v1/projects/${app.project.id}/import`
            flows[0].label += 'b'
            const response = await app.inject({
                method: 'POST',
                url: importURL,
                body: {
                    credentials: JSON.stringify(credentials),
                    credsSecret
                },
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.should.have.property('statusCode')
            response.statusCode.should.eqls(200)
            const savedCreds = await app.db.models.StorageCredentials.byProject(app.project.id)
            const inputKey = crypto.createHash('sha256').update(credsSecret).digest()
            const savedKey = crypto.createHash('sha256').update(await app.project.getCredentialSecret()).digest()
            const plainInputCreds = decryptCreds(inputKey, credentials)
            const plainSavedCreds = decryptCreds(savedKey, JSON.parse(savedCreds.credentials))
            JSON.stringify(plainSavedCreds).should.eqls(JSON.stringify(plainInputCreds))
        })

        it('Import Flow & Credentials', async function () {
            await app.project.updateSetting('credentialSecret', crypto.randomBytes(32).toString('hex'))
            const importURL = `/api/v1/projects/${app.project.id}/import`
            flows[0].label += 'c'
            const response = await app.inject({
                method: 'POST',
                url: importURL,
                body: {
                    flows: JSON.stringify(flows),
                    credentials: JSON.stringify(credentials),
                    credsSecret
                },
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.should.have.property('statusCode')
            response.statusCode.should.eqls(200)
            const savedFlow = await app.db.models.StorageFlow.byProject(app.project.id)
            const savedCreds = await app.db.models.StorageCredentials.byProject(app.project.id)
            savedFlow.flow.should.eqls(JSON.stringify(flows))
            const inputKey = crypto.createHash('sha256').update(credsSecret).digest()
            const savedKey = crypto.createHash('sha256').update(await app.project.getCredentialSecret()).digest()
            const plainInputCreds = decryptCreds(inputKey, credentials)
            const plainSavedCreds = decryptCreds(savedKey, JSON.parse(savedCreds.credentials))
            JSON.stringify(plainSavedCreds).should.eqls(JSON.stringify(plainInputCreds))
        })
        it('Import Credentials with bad secret', async function () {
            await app.project.updateSetting('credentialSecret', crypto.randomBytes(32).toString('hex'))
            const importURL = `/api/v1/projects/${app.project.id}/import`
            flows[0].label += 'd'
            const response = await app.inject({
                method: 'POST',
                url: importURL,
                body: {
                    credentials: JSON.stringify(credentials),
                    credsSecret: 'fooBar'
                },
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.should.have.property('statusCode')
            response.statusCode.should.eqls(403)
        })
    })

    describe('Validate Project Env Vars', function () {
        it('Reject Duplicate Env Var Names', async function () {
            const response = await app.inject({
                method: 'PUT',
                url: `/api/v1/projects/${app.project.id}`,
                body: {
                    settings: {
                        env: [
                            { name: 'FOO', value: 'bar' },
                            { name: 'FOO', value: 'BAR' }
                        ]
                    }
                },
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.should.have.property('statusCode')
            response.statusCode.should.eqls(400)
        })
        it('Reject Invalid names', async function () {
            const response = await app.inject({
                method: 'PUT',
                url: `/api/v1/projects/${app.project.id}`,
                body: {
                    settings: {
                        env: [
                            { name: '99FOO', value: 'bar' }
                        ]
                    }
                },
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.should.have.property('statusCode')
            response.statusCode.should.eqls(400)
        })
        it('should return empty values for hidden env vars', async () => {
            const projectSettings = await TestObjects.project1.getSetting('settings')
            projectSettings.env = [{ name: 'hidden_var', value: 'hidden-content', hidden: true }]
            await TestObjects.project1.updateSetting('settings', projectSettings)

            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/projects/${app.project.id}`,
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.should.have.property('statusCode')
            response.statusCode.should.eqls(200)

            const json = response.json()
            json.settings.env[4].should.have.property('name', 'hidden_var')
            json.settings.env[4].should.have.property('value', '')
            json.settings.env[4].should.have.property('hidden', true)
        })
        it('should store hidden env vars', async () => {
            const projectSettings = await TestObjects.project1.getSetting('settings')
            projectSettings.env = [{ name: 'hidden_var', value: 'initial-content', hidden: true }]
            await TestObjects.project1.updateSetting('settings', projectSettings)

            const response = await app.inject({
                method: 'PUT',
                url: `/api/v1/projects/${app.project.id}`,
                body: {
                    settings: {
                        env: [
                            { name: 'hidden_var', value: 'updated-content', hidden: true }
                        ]
                    }
                },
                cookies: { sid: TestObjects.tokens.alice }
            })
            const json = response.json()

            json.settings.env[4].should.have.property('name', 'hidden_var')
            json.settings.env[4].should.have.property('value', '')
            json.settings.env[4].should.have.property('hidden', true)

            const updatedProjectSettings = await TestObjects.project1.getSetting('settings')
            updatedProjectSettings.env[0].should.have.property('name', 'hidden_var')
            updatedProjectSettings.env[0].should.have.property('value', 'updated-content')
            updatedProjectSettings.env[0].should.have.property('hidden', true)
        })
        // it('Reject Illegal names', async function () {
        //     const response = await app.inject({
        //         method: 'PUT',
        //         url: `/api/v1/projects/${app.project.id}`,
        //         body: {
        //             settings: {
        //                 env: [
        //                     { name: 'FF_FOO', value: 'bar' }
        //                 ]
        //             }
        //         },
        //         cookies: { sid: TestObjects.tokens.alice }
        //     })
        //     response.should.have.property('statusCode')
        //     response.statusCode.should.eqls(400)
        // })
    })

    describe('Project History', function () {
        it('Should not get a timeline of changes to the project (EE only)', async function () {
            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/projects/${TestObjects.project1.id}/history`,
                cookies: { sid: TestObjects.tokens.bob }
            })
            response.statusCode.should.equal(404)
        })
    })

    describe('Check Project Name', function () {
        let testProject
        before(async function () {
            testProject = await createInstance(false)
        })

        it('Should reject name', async function () {
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/projects/check-name',
                payload: {
                    name: `${testProject.name}`
                },
                cookies: { sid: TestObjects.tokens.bob }
            })
            response.statusCode.should.equal(409)
            const json = response.json()
            json.should.have.property('error', 'name in use')
        })
        it('Should allow name', async function () {
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/projects/check-name',
                payload: {
                    name: `${testProject.name}-dupe`
                },
                cookies: { sid: TestObjects.tokens.bob }
            })
            response.statusCode.should.equal(200)
            const json = response.json()
            json.should.have.property('available', true)
        })
        it('Should reject baned name', async function () {
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/projects/check-name',
                payload: {
                    name: 'mqtt'
                },
                cookies: { sid: TestObjects.tokens.bob }
            })
            response.statusCode.should.equal(409)
            const json = response.json()
            json.should.have.property('error', 'name not allowed')
        })
        it('User not an Owner of any team', async function () {
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/projects/check-name',
                payload: {
                    name: `${testProject.name}-dave`
                },
                cookies: { sid: TestObjects.tokens.dave }
            })
            response.statusCode.should.equal(403)
            const json = response.json()
            json.should.have.property('code', 'unauthorized')
        })
    })

    describe('Get Project Live Status', async function () {
        let testProject
        before(async function () {
            testProject = await createInstance(false)
        })

        it('should return 200 and the live status of an instance', async function () {
            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/projects/${testProject.id}/status`,
                cookies: { sid: TestObjects.tokens.alice }
            })

            response.statusCode.should.equal(200)
            const result = response.json()
            result.should.have.property('id', testProject.id)
            result.id.should.be.String()

            result.should.have.property('name', testProject.name)

            result.should.have.property('meta').which.is.an.Object()
            result.meta.should.have.property('state', 'unknown')
        })

        it('should return 200 if the user has the project:status permission', async function () {
            const instance = await app.factory.createInstance(
                { name: generateProjectName() },
                TestObjects.ApplicationC,
                app.stack,
                app.template,
                app.projectType,
                { start: false }
            )

            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/projects/${instance.id}/status`,
                cookies: { sid: TestObjects.tokens.evan }
            })

            response.statusCode.should.equal(200)
        })

        it('should return 404 if user is not part of that team', async function () {
            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/projects/${testProject.id}/status`,
                cookies: { sid: TestObjects.tokens.chris }
            })

            response.statusCode.should.equal(404)
        })

        it('should return 404 for a non-existent project', async function () {
            const response = await app.inject({
                method: 'GET',
                url: '/api/v1/projects/non-existent-id/status',
                cookies: { sid: TestObjects.tokens.alice }
            })

            response.statusCode.should.equal(404)
            response.json().should.have.property('code', 'not_found')
        })

        it('should return 401 if no authentication is provided', async function () {
            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/projects/${testProject.id}/status`
            })

            response.statusCode.should.equal(401)
            response.json().should.have.property('code', 'unauthorized')
        })
    })

    describe('Set a project\'s state', async function () {
        let testProject
        before(async function () {
            testProject = await createInstance(false)
        })

        it('should return 401 if ownerType is not "project"', async () => {
            // Mocking session
            const response = await app.inject({
                method: 'POST',
                url: `/api/v1/projects/${testProject.id}/update-state`,
                payload: { state: 'running' },
                headers: {
                    'Content-Type': 'application/json'
                }
            })

            response.statusCode.should.equal(401)
            response.json().should.have.property('code', 'unauthorized')
        })

        it('should return 400 if "state" param is missing', async () => {
            const newAccessToken = (await testProject.refreshAuthTokens()).token

            const response = await app.inject({
                method: 'POST',
                url: `/api/v1/projects/${testProject.id}/update-state`,
                payload: { },
                headers: {
                    'Content-Type': 'application/json',
                    authorization: `Bearer ${newAccessToken}`
                }
            })

            response.statusCode.should.equal(400)
            response.json().should.have.property('code', 'FST_ERR_VALIDATION')
        })

        it('should return 202 on a valid request', async () => {
            const newAccessToken = (await testProject.refreshAuthTokens()).token

            const response = await app.inject({
                method: 'POST',
                url: `/api/v1/projects/${testProject.id}/update-state`,
                payload: { state: 'running' },
                headers: {
                    'Content-Type': 'application/json',
                    authorization: `Bearer ${newAccessToken}`
                }
            })

            response.statusCode.should.equal(202)
        })
    })

    describe('Generate snapshot change description', function () {
        it('returns 200 and forwards LLM response', async function () {
            // Stub buildSnapshot to avoid heavy export logic and signature mismatches
            const buildSnapshotStub = sinon.stub(app.db.controllers.ProjectSnapshot, 'buildProjectSnapshot').resolves({
                settings: { env: { FOO: 'bar' }, modules: {} },
                flows: { flows: [{ id: 'n1' }], credentials: {} }
            })
            const llmResponse = { transactionId: 'tid-123', data: { summary: 'Some changes' } }
            const invokeStub = sinon.stub(app.db.controllers.Assistant, 'invokeLLM').resolves(llmResponse)

            // Mock billing enabled and ensured the Team instance on the loaded project has getSubscription
            const originalBilling = app.billing
            app.billing = { enabled: true }
            // Mock license tier and team feature flag
            const originalLicense = app.license
            app.license = { get: (k) => (k === 'tier' ? 'enterprise' : undefined) }
            const originalProjectById = app.db.models.Project.byId
            const byIdStub = sinon.stub(app.db.models.Project, 'byId').callsFake(async function (id, opts) {
                const project = await originalProjectById.call(this, id, opts)
                if (project && project.Team) {
                    project.Team.getSubscription = async () => ({ isTrial: () => true })
                    project.Team.getTeamType = async () => ({
                        getFeatureProperty: (name, def) => (name === 'generatedSnapshotDescription' ? true : def)
                    })
                }
                // Mock a previous snapshot
                project.getLatestSnapshot = async () => ({
                    toJSON: () => ({
                        settings: { env: { OLD: 'value' }, modules: { oldmod: '0.1.0' } },
                        flows: { flows: [{ id: 'old' }], credentials: {} }
                    })
                })
                return project
            })

            const response = await app.inject({
                method: 'POST',
                url: `/api/v1/projects/${TestObjects.project1.id}/generate/snapshot-description`,
                payload: { target: 'latest' },
                cookies: { sid: TestObjects.tokens.alice }
            })

            try {
                response.statusCode.should.equal(200)
                const body = response.json()
                body.should.not.have.property('transactionId')
                body.should.not.have.property('data')
                body.should.have.property('summary', 'Some changes')

                // Assert LLM was invoked with correct prompt type and context
                invokeStub.called.should.equal(true)
                const args = invokeStub.getCall(0).args
                args[0].should.equal('snapshot-diff')
                // payload arg
                args[1].should.have.property('transactionId')
                args[1].should.have.property('currentState')
                args[1].should.have.property('previousState')
                // context arg
                args[2].should.have.property('instanceType', 'project')
                args[2].should.have.property('instanceId', TestObjects.project1.id)
                args[2].should.have.property('teamHashId', TestObjects.ATeam.hashid)
                args[2].should.have.property('isTeamOnTrial', true)
            } finally {
                buildSnapshotStub.restore()
                invokeStub.restore()
                byIdStub.restore()
                app.billing = originalBilling
                app.license = originalLicense
            }
        })

        it('returns 404 if not enterprise tier or feature disabled', async function () {
            const buildSnapshotStub = sinon.stub(app.db.controllers.ProjectSnapshot, 'buildProjectSnapshot').resolves({
                settings: {},
                flows: { flows: [], credentials: {} }
            })
            const invokeStub = sinon.stub(app.db.controllers.Assistant, 'invokeLLM').resolves({ transactionId: 'x', data: {} })

            // Mock non-enterprise license and disabled feature
            const originalLicense = app.license
            app.license = { get: (k) => (k === 'tier' ? 'starter' : undefined) }
            const originalProjectById = app.db.models.Project.byId
            const byIdStub = sinon.stub(app.db.models.Project, 'byId').callsFake(async function (id, opts) {
                const project = await originalProjectById.call(this, id, opts)
                if (project && project.Team) {
                    project.Team.getTeamType = async () => ({ getFeatureProperty: () => false })
                }
                return project
            })

            const response = await app.inject({
                method: 'POST',
                url: `/api/v1/projects/${TestObjects.project1.id}/generate/snapshot-description`,
                payload: { target: 'latest' },
                cookies: { sid: TestObjects.tokens.alice }
            })

            try {
                response.statusCode.should.equal(404)
                const body = response.json()
                body.should.have.property('code', 'not_found')
                // Ensure LLM was not invoked
                invokeStub.called.should.equal(false)
            } finally {
                buildSnapshotStub.restore()
                invokeStub.restore()
                byIdStub.restore()
                app.license = originalLicense
            }
        })

        it('returns 404 when license object is missing', async function () {
            const buildSnapshotStub = sinon.stub(app.db.controllers.ProjectSnapshot, 'buildProjectSnapshot').resolves({
                settings: {},
                flows: { flows: [], credentials: {} }
            })
            const invokeStub = sinon.stub(app.db.controllers.Assistant, 'invokeLLM').resolves({ transactionId: 'x', data: {} })

            // Remove license object
            const originalLicense = app.license
            app.license = null

            const originalProjectById = app.db.models.Project.byId
            const byIdStub = sinon.stub(app.db.models.Project, 'byId').callsFake(async function (id, opts) {
                const project = await originalProjectById.call(this, id, opts)
                if (project && project.Team) {
                    // Even if team feature is enabled, missing license should cause 404
                    project.Team.getTeamType = async () => ({
                        getFeatureProperty: (name, def) => (name === 'generatedSnapshotDescription' ? true : def)
                    })
                }
                return project
            })

            const response = await app.inject({
                method: 'POST',
                url: `/api/v1/projects/${TestObjects.project1.id}/generate/snapshot-description`,
                payload: { target: 'latest' },
                cookies: { sid: TestObjects.tokens.alice }
            })

            try {
                response.statusCode.should.equal(404)
                const body = response.json()
                body.should.have.property('code', 'not_found')
                invokeStub.called.should.equal(false)
            } finally {
                buildSnapshotStub.restore()
                invokeStub.restore()
                byIdStub.restore()
                app.license = originalLicense
            }
        })

        it('returns 404 when enterprise tier but generatedSnapshotDescription feature disabled', async function () {
            const buildSnapshotStub = sinon.stub(app.db.controllers.ProjectSnapshot, 'buildProjectSnapshot').resolves({
                settings: {},
                flows: { flows: [], credentials: {} }
            })
            const invokeStub = sinon.stub(app.db.controllers.Assistant, 'invokeLLM').resolves({ transactionId: 'x', data: {} })

            // Enterprise tier
            const originalLicense = app.license
            app.license = { get: (k) => (k === 'tier' ? 'enterprise' : undefined) }

            const originalProjectById = app.db.models.Project.byId
            const byIdStub = sinon.stub(app.db.models.Project, 'byId').callsFake(async function (id, opts) {
                const project = await originalProjectById.call(this, id, opts)
                if (project && project.Team) {
                    project.Team.getTeamType = async () => ({ getFeatureProperty: () => false })
                }
                return project
            })

            const response = await app.inject({
                method: 'POST',
                url: `/api/v1/projects/${TestObjects.project1.id}/generate/snapshot-description`,
                payload: { target: 'latest' },
                cookies: { sid: TestObjects.tokens.alice }
            })

            try {
                response.statusCode.should.equal(404)
                const body = response.json()
                body.should.have.property('code', 'not_found')
                invokeStub.called.should.equal(false)
            } finally {
                buildSnapshotStub.restore()
                invokeStub.restore()
                byIdStub.restore()
                app.license = originalLicense
            }
        })

        it('enforces snapshot:edit permission', async function () {
            const response = await app.inject({
                method: 'POST',
                url: `/api/v1/projects/${TestObjects.project1.id}/generate/snapshot-description`,
                payload: { target: 'latest' },
                cookies: { sid: TestObjects.tokens.bob } // bob is not an owner of ATeam
            })
            response.statusCode.should.equal(403)
            const result = response.json()
            result.should.have.property('code', 'unauthorized')
        })

        it('propagates errors from LLM invocation', async function () {
            const buildSnapshotStub = sinon.stub(app.db.controllers.ProjectSnapshot, 'buildProjectSnapshot').resolves({
                settings: {},
                flows: { flows: [], credentials: {} }
            })
            const err = { statusCode: 422, code: 'bad_request', message: 'invalid' }
            const invokeStub = sinon.stub(app.db.controllers.Assistant, 'invokeLLM').throws(err)

            // Satisfy preHandler gate: enterprise tier and feature enabled
            const originalLicense = app.license
            app.license = { get: (k) => (k === 'tier' ? 'enterprise' : undefined) }
            const originalProjectById = app.db.models.Project.byId
            const byIdStub = sinon.stub(app.db.models.Project, 'byId').callsFake(async function (id, opts) {
                const project = await originalProjectById.call(this, id, opts)
                if (project && project.Team) {
                    project.Team.getTeamType = async () => ({
                        getFeatureProperty: (name, def) => (name === 'generatedSnapshotDescription' ? true : def)
                    })
                }
                // Ensure a target snapshot is found
                project.getLatestSnapshot = async () => ({
                    toJSON: () => ({
                        settings: { env: { OLD: 'value' }, modules: {} },
                        flows: { flows: [{ id: 'old' }], credentials: {} }
                    })
                })
                return project
            })

            const response = await app.inject({
                method: 'POST',
                url: `/api/v1/projects/${TestObjects.project1.id}/generate/snapshot-description`,
                payload: { target: 'latest' },
                cookies: { sid: TestObjects.tokens.alice }
            })

            try {
                response.statusCode.should.equal(422)
                const body = response.json()
                body.should.have.property('code', 'bad_request')
                body.should.have.property('error')
            } finally {
                buildSnapshotStub.restore()
                invokeStub.restore()
                byIdStub.restore()
                app.license = originalLicense
            }
        })

        it('returns 400 when no target param is provided', async function () {
            const response = await app.inject({
                method: 'POST',
                url: `/api/v1/projects/${TestObjects.project1.id}/generate/snapshot-description`,
                payload: {},
                cookies: { sid: TestObjects.tokens.alice }
            })

            response.statusCode.should.equal(400)
            const body = response.json()
            body.should.have.property('code', 'FST_ERR_VALIDATION')
        })

        it('returns 404 when no target snapshot is found (target=latest)', async function () {
            const buildSnapshotStub = sinon.stub(app.db.controllers.ProjectSnapshot, 'buildProjectSnapshot').resolves({
                settings: {},
                flows: { flows: [], credentials: {} }
            })
            const invokeStub = sinon.stub(app.db.controllers.Assistant, 'invokeLLM').resolves({ transactionId: 'x', data: {} })

            const originalLicense = app.license
            app.license = { get: (k) => (k === 'tier' ? 'enterprise' : undefined) }
            const originalProjectById = app.db.models.Project.byId
            const byIdStub = sinon.stub(app.db.models.Project, 'byId').callsFake(async function (id, opts) {
                const project = await originalProjectById.call(this, id, opts)
                if (project && project.Team) {
                    project.Team.getTeamType = async () => ({
                        getFeatureProperty: (name, def) => (name === 'generatedSnapshotDescription' ? true : def)
                    })
                }
                // Simulate no previous snapshot found
                project.getLatestSnapshot = async () => null
                return project
            })

            const response = await app.inject({
                method: 'POST',
                url: `/api/v1/projects/${TestObjects.project1.id}/generate/snapshot-description`,
                payload: { target: 'some-code' },
                cookies: { sid: TestObjects.tokens.alice }
            })

            try {
                response.statusCode.should.equal(404)
                const body = response.json()
                body.should.have.property('code', 'not_found')
                invokeStub.called.should.equal(false)
            } finally {
                buildSnapshotStub.restore()
                invokeStub.restore()
                byIdStub.restore()
                app.license = originalLicense
            }
        })

        it('handles target=pipeline and forwards LLM response', async function () {
            const buildSnapshotStub = sinon.stub(app.db.controllers.ProjectSnapshot, 'buildProjectSnapshot').resolves({
                settings: { env: { FOO: 'bar' }, modules: {} },
                flows: { flows: [{ id: 'n1' }], credentials: {} }
            })
            const llmResponse = { transactionId: 'tid-456', data: { summary: 'Pipeline changes' } }
            const invokeStub = sinon.stub(app.db.controllers.Assistant, 'invokeLLM').resolves(llmResponse)

            const originalLicense = app.license
            app.license = { get: (k) => (k === 'tier' ? 'enterprise' : undefined) }
            const originalProjectById = app.db.models.Project.byId
            const byIdStub = sinon.stub(app.db.models.Project, 'byId').callsFake(async function (id, opts) {
                const project = await originalProjectById.call(this, id, opts)
                if (project && project.Team) {
                    project.Team.getTeamType = async () => ({
                        getFeatureProperty: (name, def) => (name === 'generatedSnapshotDescription' ? true : def)
                    })
                }
                project.getLatestDeploySnapshot = async () => ({
                    toJSON: () => ({
                        settings: { env: { OLD: 'value' }, modules: { oldmod: '0.1.0' } },
                        flows: { flows: [{ id: 'old' }], credentials: {} }
                    })
                })
                return project
            })

            const response = await app.inject({
                method: 'POST',
                url: `/api/v1/projects/${TestObjects.project1.id}/generate/snapshot-description`,
                payload: { target: 'pipeline' },
                cookies: { sid: TestObjects.tokens.alice }
            })

            try {
                response.statusCode.should.equal(200)
                const body = response.json()
                body.should.have.property('summary', 'Pipeline changes')

                const args = invokeStub.getCall(0).args
                args[1].should.have.property('target', 'pipeline')
            } finally {
                buildSnapshotStub.restore()
                invokeStub.restore()
                byIdStub.restore()
                app.license = originalLicense
            }
        })

        it('handles target as a custom id that is found', async function () {
            const buildSnapshotStub = sinon.stub(app.db.controllers.ProjectSnapshot, 'buildProjectSnapshot').resolves({
                settings: { env: { FOO: 'bar' }, modules: {} },
                flows: { flows: [{ id: 'n1' }], credentials: {} }
            })
            const llmResponse = { transactionId: 'tid-789', data: { summary: 'Custom id changes' } }
            const invokeStub = sinon.stub(app.db.controllers.Assistant, 'invokeLLM').resolves(llmResponse)

            const originalLicense = app.license
            app.license = { get: (k) => (k === 'tier' ? 'enterprise' : undefined) }
            const originalProjectById = app.db.models.Project.byId
            const byIdStub = sinon.stub(app.db.models.Project, 'byId').callsFake(async function (id, opts) {
                const project = await originalProjectById.call(this, id, opts)
                if (project && project.Team) {
                    project.Team.getTeamType = async () => ({
                        getFeatureProperty: (name, def) => (name === 'generatedSnapshotDescription' ? true : def)
                    })
                }
                return project
            })

            const originalSnapshotById = app.db.models.ProjectSnapshot.byId
            const snapshotByIdStub = sinon.stub(app.db.models.ProjectSnapshot, 'byId').callsFake(async function (sid) {
                if (sid === 'snap-123') {
                    return {
                        toJSON: () => ({
                            settings: { env: { OLD: 'value' }, modules: { oldmod: '0.1.0' } },
                            flows: { flows: [{ id: 'old' }], credentials: {} }
                        })
                    }
                }
                return originalSnapshotById.call(this, sid)
            })

            const response = await app.inject({
                method: 'POST',
                url: `/api/v1/projects/${TestObjects.project1.id}/generate/snapshot-description`,
                payload: { target: 'snap-123' },
                cookies: { sid: TestObjects.tokens.alice }
            })

            try {
                response.statusCode.should.equal(200)
                const body = response.json()
                body.should.have.property('summary', 'Custom id changes')
                const args = invokeStub.getCall(0).args
                args[1].should.have.property('target', 'snap-123')
            } finally {
                buildSnapshotStub.restore()
                invokeStub.restore()
                byIdStub.restore()
                snapshotByIdStub.restore()
                app.license = originalLicense
            }
        })

        it('returns 404 when target is a custom id that is not found', async function () {
            const buildSnapshotStub = sinon.stub(app.db.controllers.ProjectSnapshot, 'buildProjectSnapshot').resolves({
                settings: {},
                flows: { flows: [], credentials: {} }
            })
            const invokeStub = sinon.stub(app.db.controllers.Assistant, 'invokeLLM').resolves({ transactionId: 'x', data: {} })

            const originalLicense = app.license
            app.license = { get: (k) => (k === 'tier' ? 'enterprise' : undefined) }
            const originalProjectById = app.db.models.Project.byId
            const byIdStub = sinon.stub(app.db.models.Project, 'byId').callsFake(async function (id, opts) {
                const project = await originalProjectById.call(this, id, opts)
                if (project && project.Team) {
                    project.Team.getTeamType = async () => ({
                        getFeatureProperty: (name, def) => (name === 'generatedSnapshotDescription' ? true : def)
                    })
                }
                return project
            })

            const snapshotByIdStub = sinon.stub(app.db.models.ProjectSnapshot, 'byId').resolves(null)

            const response = await app.inject({
                method: 'POST',
                url: `/api/v1/projects/${TestObjects.project1.id}/generate/snapshot-description`,
                payload: { target: 'does-not-exist' },
                cookies: { sid: TestObjects.tokens.alice }
            })

            try {
                response.statusCode.should.equal(404)
                const body = response.json()
                body.should.have.property('code', 'not_found')
                invokeStub.called.should.equal(false)
            } finally {
                buildSnapshotStub.restore()
                invokeStub.restore()
                byIdStub.restore()
                snapshotByIdStub.restore()
                app.license = originalLicense
            }
        })
    })
})
