const should = require('should') // eslint-disable-line
const FF_UTIL = require('flowforge-test-utils')
const { Roles } = FF_UTIL.require('forge/lib/roles')
const crypto = require('crypto')
const sleep = require('util').promisify(setTimeout)
const setup = require('../setup')

const { KEY_HOSTNAME } = require('../../../../../forge/db/models/ProjectSettings')

function encryptCredentials (key, plain) {
    const initVector = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv('aes-256-ctr', key, initVector)
    return { $: initVector.toString('hex') + cipher.update(JSON.stringify(plain), 'utf8', 'base64') + cipher.final('base64') }
}
function decryptCredentials (key, cipher) {
    let flows = cipher.$
    const initVector = Buffer.from(flows.substring(0, 32), 'hex')
    flows = flows.substring(32)
    const decipher = crypto.createDecipheriv('aes-256-ctr', key, initVector)
    const decrypted = decipher.update(flows, 'base64', 'utf8') + decipher.final('utf8')
    return JSON.parse(decrypted)
}

describe('Project API', function () {
    let app
    const TestObjects = {}
    beforeEach(async function () {
        app = await setup({ domain: 'flowforge.dev' })

        TestObjects.project1 = app.project

        // alice : admin
        // bob
        // chris

        // ATeam ( alice (owner), bob )
        // BTeam ( alice (owner), bob (owner), chris)
        // CTeam ( chris (owner) )

        // Alice create in setup()
        TestObjects.alice = await app.db.models.User.byUsername('alice')
        TestObjects.bob = await app.db.models.User.create({ username: 'bob', name: 'Bob Solo', email: 'bob@example.com', email_verified: true, password: 'bbPassword' })
        TestObjects.chris = await app.db.models.User.create({ username: 'chris', name: 'Chris Kenobi', email: 'chris@example.com', email_verified: true, password: 'ccPassword' })

        // ATeam create in setup()
        TestObjects.ATeam = await app.db.models.Team.byName('ATeam')
        TestObjects.BTeam = await app.db.models.Team.create({ name: 'BTeam', TeamTypeId: app.defaultTeamType.id })
        TestObjects.CTeam = await app.db.models.Team.create({ name: 'CTeam', TeamTypeId: app.defaultTeamType.id })

        await TestObjects.ATeam.addUser(TestObjects.bob, { through: { role: Roles.Member } })
        await TestObjects.BTeam.addUser(TestObjects.alice, { through: { role: Roles.Owner } })
        await TestObjects.BTeam.addUser(TestObjects.bob, { through: { role: Roles.Owner } })
        await TestObjects.BTeam.addUser(TestObjects.chris, { through: { role: Roles.Member } })
        await TestObjects.CTeam.addUser(TestObjects.chris, { through: { role: Roles.Owner } })

        TestObjects.tokens = {}
        await login('alice', 'aaPassword')
        await login('bob', 'bbPassword')
        await login('chris', 'ccPassword')

        // TestObjects.tokens.alice = (await app.db.controllers.AccessToken.createTokenForPasswordReset(TestObjects.alice)).token
        TestObjects.tokens.project = (await app.project.refreshAuthTokens()).token

        TestObjects.projectType1 = app.projectType
        TestObjects.template1 = app.template
        TestObjects.stack1 = app.stack
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

    afterEach(async function () {
        await app.close()
    })

    async function addFlowsToProject (id, token, flows, creds, key, settings) {
        await app.inject({
            method: 'POST',
            url: `/storage/${id}/flows`,
            payload: flows,
            headers: {
                authorization: `Bearer ${token}`
            }
        })
        const hashKey = crypto.createHash('sha256').update(key).digest()
        await app.inject({
            method: 'POST',
            url: `/storage/${id}/credentials`,
            payload: encryptCredentials(hashKey, creds),
            headers: {
                authorization: `Bearer ${token}`
            }
        })
        await app.inject({
            method: 'POST',
            url: `/storage/${id}/settings`,
            payload: { _credentialSecret: key },
            headers: {
                authorization: `Bearer ${token}`
            }
        })
        await app.inject({
            method: 'PUT',
            url: `/api/v1/projects/${id}`,
            payload: {
                settings
            },
            cookies: { sid: TestObjects.tokens.alice }
        })
    }
    async function duplicateProject (srcId, team, template, stack, duplicateOpts, accessToken, name) {
        const responseCopiedProject = await app.inject({
            method: 'POST',
            url: '/api/v1/projects',
            payload: {
                name: name || 'project2',
                team,
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
                    name: 'test-project',
                    team: TestObjects.ATeam.hashid,
                    projectType: TestObjects.projectType1.hashid,
                    template: TestObjects.template1.hashid,
                    stack: TestObjects.stack1.hashid
                },
                cookies: { sid: TestObjects.tokens.chris }
            })
            response.statusCode.should.equal(403)
        })

        it('Non-member cannot create project', async function () {
            // Bob (non-member) cannot create in CTeam
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/projects',
                payload: {
                    name: 'test-project',
                    team: TestObjects.CTeam.hashid,
                    projectType: TestObjects.projectType1.hashid,
                    template: TestObjects.template1.hashid,
                    stack: TestObjects.stack1.hashid
                },
                cookies: { sid: TestObjects.tokens.bob }
            })
            response.statusCode.should.equal(403)
        })

        it('Fails for unknown template', async function () {
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/projects',
                payload: {
                    name: 'test-project',
                    team: TestObjects.ATeam.hashid,
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
                    name: 'test-project',
                    team: TestObjects.ATeam.hashid,
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
                    name: 'test-project',
                    team: TestObjects.ATeam.hashid,
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
                    team: TestObjects.ATeam.hashid,
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
                    team: TestObjects.ATeam.hashid,
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
                    team: TestObjects.ATeam.hashid,
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
                    team: TestObjects.ATeam.hashid,
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
                    team: TestObjects.ATeam.hashid,
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
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/projects',
                payload: {
                    name: 'test-project',
                    team: TestObjects.ATeam.hashid,
                    projectType: TestObjects.projectType1.hashid,
                    template: TestObjects.template1.hashid,
                    stack: TestObjects.stack1.hashid
                },
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(200)
            const result = response.json()
            result.should.have.property('id')
            result.should.have.property('name', 'test-project')
            result.should.have.property('safeName', 'test-project')
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
            runtimeSettings.settings.header.should.have.property('title', 'test-project')
            runtimeSettings.should.have.property('env').which.have.property('FF_PROJECT_ID', result.id)
            runtimeSettings.should.have.property('env').which.have.property('FF_PROJECT_NAME', 'test-project')
        })

        it('Create a project with upper case characters in name', async function () {
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/projects',
                payload: {
                    name: 'New-Project',
                    team: TestObjects.ATeam.hashid,
                    projectType: TestObjects.projectType1.hashid,
                    template: TestObjects.template1.hashid,
                    stack: TestObjects.stack1.hashid
                },
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(200)
            const result = response.json()
            result.should.have.property('id')
            result.should.have.property('name', 'New-Project')
            result.should.have.property('safeName', 'new-project')
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
            runtimeSettings.settings.header.should.have.property('title', 'New-Project')
        })

        it('Create a project cloned from existing one - include everything', async function () {
            // Setup some flows/credentials
            await addFlowsToProject(TestObjects.project1.id,
                TestObjects.tokens.project,
                [{ id: 'node1' }],
                { testCreds: 'abc' },
                'key1',
                {
                    httpAdminRoot: '/test-red',
                    dashboardUI: '/test-dash',
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
                    name: 'test-project',
                    team: TestObjects.ATeam.hashid,
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
            const decrypted = decryptCredentials(newKey, newCreds)
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
            runtimeSettings.settings.header.should.have.property('title', 'test-project')
            runtimeSettings.settings.should.not.have.property('credentialSecret')
            runtimeSettings.settings.should.have.property('httpAdminRoot', '/test-red')
            runtimeSettings.settings.should.have.property('dashboardUI', '/test-dash')
            runtimeSettings.should.have.property('env')
            runtimeSettings.env.should.have.property('one', 'a')
            runtimeSettings.env.should.have.property('two', 'b')
        })

        it('Create a project cloned from existing one - env-var keys only', async function () {
            // Setup some flows/credentials
            await addFlowsToProject(TestObjects.project1.id,
                TestObjects.tokens.project,
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
                    name: 'test-project',
                    projectType: TestObjects.projectType1.hashid,
                    template: TestObjects.template1.hashid,
                    stack: TestObjects.stack1.hashid,
                    team: TestObjects.ATeam.hashid,
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
            await addFlowsToProject(TestObjects.project1.id,
                TestObjects.tokens.project,
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
                    name: 'test-project',
                    projectType: TestObjects.projectType1.hashid,
                    template: TestObjects.template1.hashid,
                    stack: TestObjects.stack1.hashid,
                    team: TestObjects.ATeam.hashid,
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
            await addFlowsToProject(TestObjects.project1.id,
                TestObjects.tokens.project,
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
                    name: 'test-project',
                    projectType: TestObjects.projectType1.hashid,
                    template: TestObjects.template1.hashid,
                    stack: TestObjects.stack1.hashid,
                    team: TestObjects.ATeam.hashid,
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
            await addFlowsToProject(TestObjects.project1.id,
                TestObjects.tokens.project,
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
                    name: 'test-project',
                    projectType: TestObjects.projectType1.hashid,
                    template: TestObjects.template1.hashid,
                    stack: TestObjects.stack1.hashid,
                    team: TestObjects.ATeam.hashid,
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
                    name: 'test-project',
                    team: TestObjects.BTeam.hashid,
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
                    name: 'test-project',
                    team: TestObjects.ATeam.hashid,
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

    describe('Update Project', function () {
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
            const project2 = await app.db.models.Project.create({ name: 'project2', type: '', url: '' })
            await TestObjects.ATeam.addProject(project2)
            await project2.setProjectStack(TestObjects.stack1)
            await project2.setProjectTemplate(TestObjects.template1)

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
                url: `/api/v1/projects/${project2.id}`,
                payload: {
                    projectType: projectType2.hashid
                },
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(400)
        })
        it('Can change project-type if not set', async function () {
            const project2 = await app.db.models.Project.create({ name: 'project2', type: '', url: '' })
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

        it('Change project stack', async function () {
            // Setup some flows/credentials
            await addFlowsToProject(TestObjects.project1.id,
                TestObjects.tokens.project,
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
                    stack: stack2.id
                },
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(200)
            await sleep(850) // "Update a project" returns early so it is necessary to wait at least 250ms+500ms (stop/start time as set in stub driver)
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

        it('Change project stack - legacy project', async function () {
            // Check a 0.2.0 project that does not have a Stack can have its
            // stack set.

            // Setup some flows/credentials
            await addFlowsToProject(TestObjects.project1.id,
                TestObjects.tokens.project,
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

            // Delete the stack from the project
            newProject.ProjectStackId = null
            await newProject.save()

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
                    stack: stack2.id
                },
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(200)
            await sleep(850) // "Update a project" returns early so it is necessary to wait at least 250ms+500ms (stop/start time as set in stub driver)
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

        it('Change project name', async function () {
            // Setup some flows/credentials
            await addFlowsToProject(TestObjects.project1.id,
                TestObjects.tokens.project,
                [{ id: 'node1' }],
                { testCreds: 'abc' },
                'key1',
                {}
            )

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

        it('Change 1 project setting', async function () {
            // Setup some flows/credentials
            await addFlowsToProject(TestObjects.project1.id,
                TestObjects.tokens.project,
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
            await sleep(850) // "Update a project" returns early so it is necessary to wait at least 250ms+500ms (stop/start time as set in stub driver)
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
            await addFlowsToProject(TestObjects.project1.id,
                TestObjects.tokens.project,
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
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(200)
            await sleep(850) // "Update a project" returns early so it is necessary to wait at least 250ms+500ms (stop/start time as set in stub driver)
            const newSettings = await TestObjects.project1.getSetting('settings')
            newSettings.should.have.property('codeEditor', 'monaco') // should be unchanged
            newSettings.should.have.property('httpAdminRoot', '/test-red') // should be unchanged
            newSettings.should.have.property('env', [
                { name: 'one', value: '1' },
                { name: 'two', value: '2' }
            ]) // should be unchanged
        })
        it('Change project env vars - member', async function () {
            // Setup some flows/credentials
            await addFlowsToProject(TestObjects.project1.id,
                TestObjects.tokens.project,
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
            await sleep(850) // "Update a project" returns early so it is necessary to wait at least 250ms+500ms (stop/start time as set in stub driver)
            const newSettings = await TestObjects.project1.getSetting('settings')
            newSettings.should.have.property('codeEditor', 'monaco') // should be unchanged
            newSettings.should.have.property('httpAdminRoot', '/test-red') // should be unchanged
            newSettings.should.have.property('env', [
                { name: 'one', value: '1' },
                { name: 'two', value: '2' }
            ]) // should be unchanged
        })

        describe('Update hostname', function () {
            it('Changes the projects hostname', async function () {
                // call "Update a project" with a new hostname
                const response = await app.inject({
                    method: 'PUT',
                    url: `/api/v1/projects/${TestObjects.project1.id}`,
                    payload: {
                        hostname: 'host.example.com'
                    },
                    cookies: { sid: TestObjects.tokens.alice }
                })
                response.statusCode.should.equal(200)
                response.json().should.have.property('hostname', 'host.example.com')
            })

            it('Trims a trailing full-stop', async function () {
                const response = await app.inject({
                    method: 'PUT',
                    url: `/api/v1/projects/${TestObjects.project1.id}`,
                    payload: {
                        hostname: 'my-project.flowforge.com.'
                    },
                    cookies: { sid: TestObjects.tokens.alice }
                })
                response.statusCode.should.equal(200)
                response.json().should.have.property('hostname', 'my-project.flowforge.com')
            })

            it('Requires a FQDN', async function () {
                // call "Update a project" with a new hostname
                const response = await app.inject({
                    method: 'PUT',
                    url: `/api/v1/projects/${TestObjects.project1.id}`,
                    payload: {
                        hostname: 'examplecom'
                    },
                    cookies: { sid: TestObjects.tokens.alice }
                })
                response.statusCode.should.equal(409)
                response.json().should.have.property('code', 'invalid_hostname')
            })

            it('Requires the hostname to be unique case-insensitively', async function () {
                const existingProject = await app.db.models.Project.create({ name: 'project2', type: '', url: '' })
                existingProject.updateSetting(KEY_HOSTNAME, 'already-in-use.flowforge.com')

                // call "Update a project" with a new hostname
                const response = await app.inject({
                    method: 'PUT',
                    url: `/api/v1/projects/${TestObjects.project1.id}`,
                    payload: {
                        hostname: 'Already-In-Use.FlowForge.com'
                    },
                    cookies: { sid: TestObjects.tokens.alice }
                })
                response.statusCode.should.equal(409)
                response.json().code.should.match('invalid_hostname')
                response.json().error.should.containEql('in use')
            })

            it('Does not allow hostnames that end with the host domain', async function () {
                // call "Update a project" with a new hostname
                const response = await app.inject({
                    method: 'PUT',
                    url: `/api/v1/projects/${TestObjects.project1.id}`,
                    payload: {
                        hostname: 'in-use-as-domain.FlowForge.dev'
                    },
                    cookies: { sid: TestObjects.tokens.alice }
                })
                response.statusCode.should.equal(409)
                response.json().code.should.match('invalid_hostname')
                response.json().error.should.containEql('in use')
            })
        })

        it('Export to another project - includes everything ', async function () {
            // Setup some flows/credentials
            await addFlowsToProject(TestObjects.project1.id,
                TestObjects.tokens.project,
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
                    team: TestObjects.ATeam.hashid,
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
            await sleep(850) // "Update a project" returns early so it is necessary to wait at least 250ms+500ms (stop/start time as set in stub driver)

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
            const decrypted = decryptCredentials(newKey, newCreds)
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
            await addFlowsToProject(TestObjects.project1.id,
                TestObjects.tokens.project,
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
            await sleep(850) // "Update a project" returns early so it is necessary to wait at least 250ms+500ms (stop/start time as set in stub driver)
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
            await addFlowsToProject(TestObjects.project1.id,
                TestObjects.tokens.project,
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
            await sleep(850) // "Update a project" returns early so it is necessary to wait at least 250ms+500ms (stop/start time as set in stub driver)
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
            await addFlowsToProject(TestObjects.project1.id,
                TestObjects.tokens.project,
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
            await sleep(850) // "Update a project" returns early so it is necessary to wait at least 250ms+500ms (stop/start time as set in stub driver)
            const newAccessToken = (await newProject.refreshAuthTokens()).token
            const newCreds = await getProjectInfo(newProject.id, newAccessToken, 'credentials')
            Object.keys(newCreds).should.have.length(0)
        })
        it('Export to another project - no flows/creds', async function () {
            // Setup some flows/credentials
            await addFlowsToProject(TestObjects.project1.id,
                TestObjects.tokens.project,
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
            await sleep(850) // "Update a project" returns early so it is necessary to wait at least 250ms+500ms (stop/start time as set in stub driver)
            const newAccessToken = (await newProject.refreshAuthTokens()).token
            // Flows should be empty
            const newFlows = await getProjectInfo(newProject.id, newAccessToken, 'flows')
            newFlows.should.have.length(0)
            // Creds should be empty
            const newCreds = await getProjectInfo(newProject.id, newAccessToken, 'credentials')
            Object.keys(newCreds).should.have.length(0)
        })
    })
    describe('Project Settings', function () {
        it('Project token can get project Settings', async function () {
            const settingsURL = `/api/v1/projects/${app.project.id}/settings`
            const response = await app.inject({
                method: 'GET',
                url: settingsURL,
                headers: {
                    authorization: `Bearer ${TestObjects.tokens.project}`
                }
            })
            const newSettings = response.json()
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

            const project2 = await app.db.models.Project.create({ name: 'project2', type: '', url: '' })
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
            const plainInputCreds = decryptCredentials(inputKey, credentials)
            const plainSavedCreds = decryptCredentials(savedKey, JSON.parse(savedCreds.credentials))
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
            const plainInputCreds = decryptCredentials(inputKey, credentials)
            const plainSavedCreds = decryptCredentials(savedKey, JSON.parse(savedCreds.credentials))
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
})
