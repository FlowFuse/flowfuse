const should = require('should') // eslint-disable-line
const FF_UTIL = require('flowforge-test-utils')
const { Roles } = FF_UTIL.require('forge/lib/roles')
const crypto = require('crypto')

const setup = require('../setup')

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
        app = await setup()

        TestObjects.project1 = app.project

        // alice : admin
        // bob
        // chris

        // BTeam ( alice (owner), bob (owner), chris)
        // CTeam ( chris (owner) )

        // Alice create in setup()
        TestObjects.alice = await app.db.models.User.byUsername('alice')
        TestObjects.bob = await app.db.models.User.create({ username: 'bob', name: 'Bob Solo', email: 'bob@example.com', email_verified: true, password: 'bbPassword' })
        TestObjects.chris = await app.db.models.User.create({ username: 'chris', name: 'Chris Kenobi', email: 'chris@example.com', password: 'ccPassword' })

        // ATeam create in setup()
        TestObjects.ATeam = await app.db.models.Team.byName('ATeam')
        TestObjects.BTeam = await app.db.models.Team.create({ name: 'BTeam' })
        TestObjects.CTeam = await app.db.models.Team.create({ name: 'CTeam' })

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
                    template: TestObjects.template1.hashid,
                    stack: 'doesnotexist'
                },
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(400)
            const result = response.json()
            result.should.have.property('error', 'Invalid stack')
        })

        it('Fails for duplicate project name', async function () {
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/projects',
                payload: {
                    name: TestObjects.project1.name,
                    team: TestObjects.ATeam.hashid,
                    template: TestObjects.template1.hashid,
                    stack: TestObjects.stack1.hashid
                },
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(409)
            const result = response.json()
            result.should.have.property('error', 'name in use')
        })

        it('Create a project', async function () {
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/projects',
                payload: {
                    name: 'test-project',
                    team: TestObjects.ATeam.hashid,
                    template: TestObjects.template1.hashid,
                    stack: TestObjects.stack1.hashid
                },
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(200)
            const result = response.json()
            result.should.have.property('id')
            result.should.have.property('name', 'test-project')
            result.should.have.property('team')
            result.should.have.property('template')
            result.template.should.have.property('id', TestObjects.template1.hashid)
            result.should.have.property('stack')
            result.stack.should.have.property('id', TestObjects.stack1.hashid)
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
            newSettings.should.have.property('_credentialSecret')
            const newKey = crypto.createHash('sha256').update(newSettings._credentialSecret).digest()
            const decrypted = decryptCredentials(newKey, newCreds)
            decrypted.should.have.property('testCreds', 'abc')

            const runtimeSettings = (await app.inject({
                method: 'GET',
                url: `/api/v1/projects/${newProject.id}/settings`,
                headers: {
                    authorization: `Bearer ${newAccessToken}`
                }
            })).json()
            runtimeSettings.settings.should.not.have.property('credentialSecret')
            runtimeSettings.settings.should.have.property('httpAdminRoot', '/test-red')
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
                    template: TestObjects.template1.hashid,
                    stack: TestObjects.stack1.hashid,
                    sourceProject: {
                        id: 'does-not-exist',
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
    })
})
