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
// function decryptCredentials (key, cipher) {
//     let flows = cipher.$
//     const initVector = Buffer.from(flows.substring(0, 32), 'hex')
//     flows = flows.substring(32)
//     const decipher = crypto.createDecipheriv('aes-256-ctr', key, initVector)
//     const decrypted = decipher.update(flows, 'base64', 'utf8') + decipher.final('utf8')
//     return JSON.parse(decrypted)
// }

describe('Project Snapshots API', function () {
    let app
    const TestObjects = {}
    beforeEach(async function () {
        app = await setup()

        TestObjects.project1 = app.project

        // alice : admin
        // bob
        // chris

        // ATeam ( alice (owner), bob )

        // project1 owned by ATeam

        // Alice create in setup()
        TestObjects.alice = await app.db.models.User.byUsername('alice')
        TestObjects.bob = await app.db.models.User.create({ username: 'bob', name: 'Bob Solo', email: 'bob@example.com', email_verified: true, password: 'bbPassword' })
        TestObjects.chris = await app.db.models.User.create({ username: 'chris', name: 'Chris Kenobi', email: 'chris@example.com', email_verified: true, password: 'ccPassword' })

        // ATeam create in setup()
        TestObjects.ATeam = await app.db.models.Team.byName('ATeam')
        await TestObjects.ATeam.addUser(TestObjects.bob, { through: { role: Roles.Member } })

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

    // This is copy/paste from project_spec.js - consider moving out to utils
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

    async function createSnapshot (projectId, name, token) {
        return await app.inject({
            method: 'POST',
            url: `/api/v1/projects/${projectId}/snapshots`,
            payload: {
                name
            },
            cookies: { sid: token }
        })
    }
    async function listProjectSnapshots (projectId, token) {
        return await app.inject({
            method: 'GET',
            url: `/api/v1/projects/${projectId}/snapshots`,
            cookies: { sid: token }
        })
    }
    describe('Create project snapshot', function () {
        it('Non-owner can create project snapshot', async function () {
            // Bob (non-owner) can create in ATeam
            const response = await createSnapshot(TestObjects.project1.id, 'test-project-snapshot-01', TestObjects.tokens.bob)
            response.statusCode.should.equal(200)
        })

        it('Non-member cannot create project snapshot', async function () {
            // Chris (non-member) cannot create in ATeam
            const response = await createSnapshot(TestObjects.project1.id, 'test-project-snapshot-01', TestObjects.tokens.chris)
            // 404 as a non member should not know the resource exists
            response.statusCode.should.equal(404)
        })

        it('Create a project snapshot - empty state', async function () {
            const response = await createSnapshot(TestObjects.project1.id, 'test-project-snapshot-01', TestObjects.tokens.alice)
            response.statusCode.should.equal(200)
            const result = response.json()
            result.should.have.property('id')
            result.should.have.property('name', 'test-project-snapshot-01')
            result.should.have.property('createdAt')
            result.should.have.property('updatedAt')
            result.should.have.property('user')
            result.user.should.have.property('id', TestObjects.alice.hashid)

            const snapshotObj = await app.db.models.ProjectSnapshot.byId(result.id)
            const snapshot = snapshotObj.toJSON()
            snapshot.flows.should.have.property('flows')
            snapshot.flows.flows.should.have.lengthOf(0)
            snapshot.flows.should.not.have.property('credentials')
            snapshot.settings.should.have.property('settings')
            snapshot.settings.should.have.property('env')
            snapshot.settings.should.have.property('modules')
        })

        it('Create a project snapshot - capture real state', async function () {
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
            const response = await createSnapshot(TestObjects.project1.id, 'test-project-snapshot-01', TestObjects.tokens.alice)
            response.statusCode.should.equal(200)
            const result = response.json()
            result.should.have.property('id')
            result.should.have.property('name', 'test-project-snapshot-01')
            result.should.have.property('createdAt')
            result.should.have.property('updatedAt')
            result.should.have.property('user')
            result.user.should.have.property('id', TestObjects.alice.hashid)

            const snapshotObj = await app.db.models.ProjectSnapshot.byId(result.id)
            const snapshot = snapshotObj.toJSON()
            snapshot.flows.should.have.property('flows')
            snapshot.flows.flows.should.have.lengthOf(1)
            snapshot.flows.flows[0].should.have.property('id', 'node1')
            snapshot.flows.should.have.property('credentials')
            snapshot.flows.credentials.should.have.property('$')
            snapshot.settings.should.have.property('settings')
            snapshot.settings.settings.should.have.property('httpAdminRoot', '/test-red')
            snapshot.settings.settings.should.have.property('dashboardUI', '/test-dash')
            snapshot.settings.should.have.property('env')
            snapshot.settings.env.should.have.property('one', 'a')
            snapshot.settings.env.should.have.property('two', 'b')
            snapshot.settings.should.have.property('modules')
        })

        it('Create a project snapshot - externally provided flows/creds/modules real state', async function () {
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
                url: `/api/v1/projects/${TestObjects.project1.id}/snapshots`,
                payload: {
                    name: 'test-project-snapshot-02',
                    flows: [{ id: 'nodeNew' }],
                    credentials: { nodeNew: { a: 1 } },
                    settings: {
                        modules: {
                            foo: '1.2'
                        }
                    }
                },
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(200)
            const result = response.json()
            result.should.have.property('id')
            result.should.have.property('name', 'test-project-snapshot-02')
            result.should.have.property('createdAt')
            result.should.have.property('updatedAt')
            result.should.have.property('user')
            result.user.should.have.property('id', TestObjects.alice.hashid)

            const snapshotObj = await app.db.models.ProjectSnapshot.byId(result.id)
            const snapshot = snapshotObj.toJSON()
            snapshot.flows.should.have.property('flows')
            snapshot.flows.flows.should.have.lengthOf(1)
            snapshot.flows.flows[0].should.have.property('id', 'nodeNew')
            snapshot.flows.should.have.property('credentials')
            snapshot.flows.credentials.should.have.property('$')
            snapshot.settings.should.have.property('settings')
            snapshot.settings.settings.should.have.property('httpAdminRoot', '/test-red')
            snapshot.settings.settings.should.have.property('dashboardUI', '/test-dash')
            snapshot.settings.should.have.property('env')
            snapshot.settings.env.should.have.property('one', 'a')
            snapshot.settings.env.should.have.property('two', 'b')
            snapshot.settings.should.have.property('modules')
            snapshot.settings.modules.should.have.property('foo', '1.2')
        })
    })

    describe('Rollback a snapshot', function () {
        it('Rolls back to a different snapshot', async function () {
            // Setup an initial configuration
            await addFlowsToProject(TestObjects.project1.id,
                TestObjects.tokens.project,
                [{ id: 'node1' }],
                { testCreds: 'abc' },
                'key1',
                {
                    httpAdminRoot: '/test-red',
                    dashboardUI: '/test-dash',
                    palette: {
                        modules: [
                            { name: 'module1', version: 'v1' }
                        ]
                    },
                    env: [
                        { name: 'one', value: 'a' },
                        { name: 'two', value: 'b' }
                    ]
                }
            )
            // Generate a snapshot
            const response = await createSnapshot(TestObjects.project1.id, 'test-project-snapshot-01', TestObjects.tokens.alice)
            response.statusCode.should.equal(200)
            const snapshot1 = response.json()

            // Change lots of things
            await addFlowsToProject(TestObjects.project1.id,
                TestObjects.tokens.project,
                [{ id: 'node2' }],
                { testCreds: 'def' },
                'key1',
                {
                    httpAdminRoot: '/test-red-2',
                    dashboardUI: '/test-dash-2',
                    palette: {
                        modules: [
                            { name: 'module2', version: 'v2' }
                        ]
                    },
                    env: [
                        { name: 'one', value: 'a2' },
                        { name: 'two', value: 'b2' }
                    ]
                }
            )

            // Rollback to the original snapshot
            const rollbackResponse = await app.inject({
                method: 'POST',
                url: `/api/v1/projects/${app.project.id}/actions/rollback`,
                payload: {
                    snapshot: snapshot1.id
                },
                cookies: { sid: TestObjects.tokens.alice }
            })
            rollbackResponse.statusCode.should.equal(200)

            // Get the new settings after rollback
            const settingsURL = `/api/v1/projects/${app.project.id}/settings`
            const rolledBackSettingsResponse = await app.inject({
                method: 'GET',
                url: settingsURL,
                headers: {
                    authorization: `Bearer ${TestObjects.tokens.project}`
                }
            })
            const rolledBackSettings = rolledBackSettingsResponse.json()

            // Validate the new settings are correct
            rolledBackSettings.settings.palette.modules.should.have.property('module1', 'v1')
            rolledBackSettings.settings.palette.modules.should.not.have.property('module2', 'v2')
            rolledBackSettings.settings.httpAdminRoot.should.equal('/test-red')
            rolledBackSettings.env.should.have.property('one', 'a')
        })
    })

    describe('Get snapshot information', function () {
        it('Non-member cannot get project snapshot', async function () {
            // Chris (non-member) cannot create in ATeam

            // First alice creates one
            const snapshotResponse = await createSnapshot(TestObjects.project1.id, 'test-project-snapshot-01', TestObjects.tokens.alice)
            const result = snapshotResponse.json()

            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/projects/${TestObjects.project1.id}/snapshots/${result.id}`,
                cookies: { sid: TestObjects.tokens.chris }
            })
            // 404 as a non member should not know the resource exists
            response.statusCode.should.equal(404)
        })
        it('Get snapshot', async function () {
            // First alice creates one
            const snapshotResponse = await createSnapshot(TestObjects.project1.id, 'test-project-snapshot-01', TestObjects.tokens.alice)
            const snapshotResult = snapshotResponse.json()

            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/projects/${TestObjects.project1.id}/snapshots/${snapshotResult.id}`,
                cookies: { sid: TestObjects.tokens.alice }
            })
            const result = response.json()
            result.should.have.property('id', snapshotResult.id)
        })
    })

    describe('Delete a snapshot', function () {
        it('Non-owner cannot delete a project snapshot', async function () {
            // Bob (non-owner) cannot delete in ATeam

            // First alice creates one
            const snapshotResponse = await createSnapshot(TestObjects.project1.id, 'test-project-snapshot-01', TestObjects.tokens.alice)
            const result = snapshotResponse.json()

            // Then bob tries to delete it
            const response = await app.inject({
                method: 'DELETE',
                url: `/api/v1/projects/${TestObjects.project1.id}/snapshots/${result.id}`,
                cookies: { sid: TestObjects.tokens.bob }
            })
            response.statusCode.should.equal(403)
        })
        it('Team owner can delete a project snapshot', async function () {
            // Alice (owner) can delete in ATeam

            // First alice creates one
            const snapshotResponse = await createSnapshot(TestObjects.project1.id, 'test-project-snapshot-01', TestObjects.tokens.alice)
            const result = snapshotResponse.json()

            // Then alice tries to delete it
            const response = await app.inject({
                method: 'DELETE',
                url: `/api/v1/projects/${TestObjects.project1.id}/snapshots/${result.id}`,
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(200)

            const snapshotList = (await listProjectSnapshots(TestObjects.project1.id, TestObjects.tokens.alice)).json()
            snapshotList.should.have.property('snapshots')
            snapshotList.snapshots.should.have.lengthOf(0)
        })
    })
})
