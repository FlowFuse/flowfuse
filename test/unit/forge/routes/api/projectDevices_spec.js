const should = require('should') // eslint-disable-line
const setup = require('../setup')
const FF_UTIL = require('flowforge-test-utils')
const { Roles } = FF_UTIL.require('forge/lib/roles')

describe('Project/Device API', async function () {
    let app
    const TestObjects = {}

    async function createDevice (options) {
        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/devices',
            body: {
                name: options.name,
                type: options.type,
                team: options.team
            },
            cookies: { sid: options.as }
        })
        return response.json()
    }

    beforeEach(async function () {
        app = await setup({ features: { devices: true } })

        // alice : admin
        // bob
        // chris

        // ATeam ( alice  (owner), bob (owner), chris)
        // BTeam ( bob (owner), chris)
        // CTeam ( chris (owner) )

        // Alice create in setup()
        TestObjects.alice = await app.db.models.User.byUsername('alice')
        TestObjects.bob = await app.db.models.User.create({ username: 'bob', name: 'Bob Solo', email: 'bob@example.com', email_verified: true, password: 'bbPassword' })
        TestObjects.chris = await app.db.models.User.create({ username: 'chris', name: 'Chris Kenobi', email: 'chris@example.com', email_verified: true, password: 'ccPassword' })

        // ATeam create in setup()
        TestObjects.ATeam = await app.db.models.Team.byName('ATeam')
        TestObjects.BTeam = await app.db.models.Team.create({ name: 'BTeam', TeamTypeId: app.defaultTeamType.id })
        TestObjects.CTeam = await app.db.models.Team.create({ name: 'CTeam', TeamTypeId: app.defaultTeamType.id })

        // Alice set as ATeam owner in setup()
        await TestObjects.ATeam.addUser(TestObjects.bob, { through: { role: Roles.Owner } })
        await TestObjects.ATeam.addUser(TestObjects.chris, { through: { role: Roles.Member } })
        await TestObjects.BTeam.addUser(TestObjects.bob, { through: { role: Roles.Owner } })
        await TestObjects.BTeam.addUser(TestObjects.chris, { through: { role: Roles.Member } })
        await TestObjects.CTeam.addUser(TestObjects.chris, { through: { role: Roles.Owner } })

        TestObjects.tokens = {}
        await login('alice', 'aaPassword')
        await login('bob', 'bbPassword')
        await login('chris', 'ccPassword')
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
    async function setupProjectWithSnapshot () {
        TestObjects.deviceProject = await app.db.models.Project.create({ name: 'deviceProject', type: '', url: '' })
        TestObjects.deviceProject.setTeam(TestObjects.ATeam)
        // Create a snapshot
        TestObjects.deviceProjectSnapshot = (await createSnapshot(TestObjects.deviceProject.id, 'test-snapshot', TestObjects.tokens.alice)).json()
    }
    async function setProjectActiveSnapshot (projectId, snapshotId, token) {
        return app.inject({
            method: 'POST',
            url: `/api/v1/projects/${projectId}/devices/settings`,
            body: {
                targetSnapshot: snapshotId
            },
            cookies: { sid: token }
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
    async function getDeviceDetails (deviceId, token) {
        return await app.inject({
            method: 'GET',
            url: `/api/v1/devices/${deviceId}`,
            cookies: { sid: token }
        })
    }

    afterEach(async function () {
        await app.close()
    })

    describe('Get list of devices assigned to a project', async function () {
        // GET /api/v1/project/:projectId/devices
        // - Admin/Owner/Member
    })

    describe('Get project device settings', async function () {
        // GET /api/v1/project/:projectId/devices/settings
        // - Admin/Owner/Member
    })
    describe('Update project device settings', async function () {
        // GET /api/v1/project/:projectId/devices/settings
        // - Admin/Owner/Member

        it('fails for snapshot for different project', async function () {
            // Setup device project
            await setupProjectWithSnapshot(false)
            // Setup a second project
            const deviceProject2 = await app.db.models.Project.create({ name: 'deviceProject2', type: '', url: '' })
            deviceProject2.setTeam(TestObjects.ATeam)
            // Create a snapshot
            const otherSnapshot = (await createSnapshot(deviceProject2.id, 'test-snapshot-2', TestObjects.tokens.alice)).json()

            const response = await setProjectActiveSnapshot(TestObjects.deviceProject.id, otherSnapshot.id, TestObjects.tokens.alice)
            response.should.have.property('statusCode', 400)
            response.json().should.have.property('error', 'Invalid snapshot')
        })

        it('fails for unknown snapshot', async function () {
            // Setup device project
            await setupProjectWithSnapshot(false)
            const response = await setProjectActiveSnapshot(TestObjects.deviceProject.id, 'does-not-exist', TestObjects.tokens.alice)
            response.should.have.property('statusCode', 400)
            response.json().should.have.property('error', 'Invalid snapshot')
        })

        it('can update the project target snapshot', async function () {
            // Create a project - but do not activate snapshot
            await setupProjectWithSnapshot(false)

            const device = await createDevice({ name: 'Ad1', type: '', team: TestObjects.ATeam.hashid, as: TestObjects.tokens.alice })
            const response = await app.inject({
                method: 'PUT',
                url: `/api/v1/devices/${device.id}`,
                body: {
                    project: TestObjects.deviceProject.id
                },
                cookies: { sid: TestObjects.tokens.alice }
            })
            const result = response.json()
            result.should.have.property('project')
            result.should.have.property('targetSnapshot', null)
            result.project.should.have.property('id', TestObjects.deviceProject.id)

            // Create a second device not in this project
            const device2 = await createDevice({ name: 'Ad2', type: '', team: TestObjects.ATeam.hashid, as: TestObjects.tokens.alice })

            await setProjectActiveSnapshot(TestObjects.deviceProject.id, TestObjects.deviceProjectSnapshot.id, TestObjects.tokens.alice)

            // Now check that device has an updated targetSnapshot, but device2 hasn't been touched
            const deviceDetails = (await getDeviceDetails(device.id, TestObjects.tokens.alice)).json()
            deviceDetails.should.have.property('targetSnapshot')
            deviceDetails.targetSnapshot.should.have.property('id', TestObjects.deviceProjectSnapshot.id)

            const device2Details = (await getDeviceDetails(device2.id, TestObjects.tokens.alice)).json()
            device2Details.should.have.property('targetSnapshot', null)
        })
    })
})
