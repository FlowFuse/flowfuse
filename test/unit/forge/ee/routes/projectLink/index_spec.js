const should = require('should') // eslint-disable-line

const setup = require('../../setup')

describe('Project Link API', function () {
    let app
    const TestObjects = { tokens: {} }

    async function login (username, password) {
        const response = await app.inject({
            method: 'POST',
            url: '/account/login',
            payload: { username, password, remember: false }
        })
        response.cookies.should.have.length(1)
        TestObjects.tokens[username] = response.cookies[0].value
    }

    async function getTargets (teamId, token) {
        return app.inject({
            method: 'GET',
            url: `/api/v1/teams/${teamId}/project-link/targets`,
            headers: { Authorization: `Bearer ${token}` }
        })
    }

    before(async function () {
        app = await setup()
        await login('alice', 'aaPassword')

        TestObjects.application2 = await app.factory.createApplication({ name: 'application-2' }, app.team)
        TestObjects.instance2 = await app.factory.createInstance(
            { name: 'project2' },
            TestObjects.application2,
            app.stack,
            app.template,
            app.projectType,
            { start: false }
        )
        TestObjects.appDevice = await app.factory.createDevice({ name: 'app-device', type: 'pi' }, app.team, null, TestObjects.application2)
        TestObjects.instanceDevice = await app.factory.createDevice({ name: 'instance-device' }, app.team, app.instance)
        TestObjects.unassignedDevice = await app.factory.createDevice({ name: 'unassigned-device' }, app.team)

        TestObjects.tokens.project = (await app.instance.refreshAuthTokens()).token
        // get db Devices with all associations (refreshAuthTokens needs device.Team)
        TestObjects.tokens.appDevice = (await (await app.db.models.Device.byId(TestObjects.appDevice.id)).refreshAuthTokens()).token
        TestObjects.tokens.instanceDevice = (await (await app.db.models.Device.byId(TestObjects.instanceDevice.id)).refreshAuthTokens()).token
        TestObjects.tokens.unassignedDevice = (await (await app.db.models.Device.byId(TestObjects.unassignedDevice.id)).refreshAuthTokens()).token
        TestObjects.tokens.alicePAT = (await app.db.controllers.AccessToken.createPersonalAccessToken(app.user, '', null, 'alice-pat')).token

        TestObjects.team2 = await app.factory.createTeam({ name: 'BTeam' })
        const team2Device = await app.factory.createDevice({ name: 'team2-device' }, TestObjects.team2)
        TestObjects.tokens.team2Device = (await (await app.db.models.Device.byId(team2Device.id)).refreshAuthTokens()).token
    })

    after(async function () {
        await app.close()
    })

    it('lists applications with their instances and app owned devices for a project token', async function () {
        const response = await getTargets(app.team.hashid, TestObjects.tokens.project)
        response.statusCode.should.equal(200)
        const result = response.json()

        Object.keys(result).should.eql(['self', 'applications'])
        result.should.have.property('self', { id: app.instance.id, applicationId: app.application.hashid })
        result.applications.should.have.length(2)

        const app1 = result.applications.find(a => a.id === app.application.hashid)
        app1.should.have.property('name', 'application-1')
        app1.instances.should.eql([{ id: app.instance.id, name: app.instance.name }])
        // instance owned devices are reached via their instance so are not listed
        app1.devices.should.have.length(0)

        const app2 = result.applications.find(a => a.id === TestObjects.application2.hashid)
        app2.instances.should.eql([{ id: TestObjects.instance2.id, name: 'project2' }])
        app2.devices.should.eql([{ id: `dev:${TestObjects.appDevice.hashid}`, name: 'app-device' }])
    })

    it('returns the app owned device identity for a device token', async function () {
        const response = await getTargets(app.team.hashid, TestObjects.tokens.appDevice)
        response.statusCode.should.equal(200)
        response.json().should.have.property('self', { id: `dev:${TestObjects.appDevice.hashid}`, applicationId: TestObjects.application2.hashid })
    })

    it('returns the owning instance identity for an instance owned device token', async function () {
        const response = await getTargets(app.team.hashid, TestObjects.tokens.instanceDevice)
        response.statusCode.should.equal(200)
        response.json().should.have.property('self', { id: app.instance.id, applicationId: app.application.hashid })
    })

    it('returns no identity for an unassigned device token', async function () {
        const response = await getTargets(app.team.hashid, TestObjects.tokens.unassignedDevice)
        response.statusCode.should.equal(200)
        const result = response.json()
        result.should.have.property('self', null)
        const deviceIds = result.applications.flatMap(a => a.devices.map(d => d.id))
        deviceIds.should.not.containEql(`dev:${TestObjects.unassignedDevice.hashid}`)
    })

    it('rejects a project token for another team', async function () {
        const response = await getTargets(TestObjects.team2.hashid, TestObjects.tokens.project)
        response.statusCode.should.equal(404)
    })

    it('rejects a device token for another team', async function () {
        const response = await getTargets(app.team.hashid, TestObjects.tokens.team2Device)
        response.statusCode.should.equal(404)
    })

    it('rejects a user session', async function () {
        const response = await app.inject({
            method: 'GET',
            url: `/api/v1/teams/${app.team.hashid}/project-link/targets`,
            cookies: { sid: TestObjects.tokens.alice }
        })
        response.statusCode.should.equal(403)
    })

    it('rejects a personal access token', async function () {
        const response = await getTargets(app.team.hashid, TestObjects.tokens.alicePAT)
        response.statusCode.should.equal(403)
    })

    it('rejects a request without credentials', async function () {
        const response = await app.inject({
            method: 'GET',
            url: `/api/v1/teams/${app.team.hashid}/project-link/targets`
        })
        response.statusCode.should.equal(401)
    })

    it('returns 404 when project communication is disabled', async function () {
        app.config.features.register('projectComms', false, false)
        try {
            const response = await getTargets(app.team.hashid, TestObjects.tokens.project)
            response.statusCode.should.equal(404)
        } finally {
            app.config.features.register('projectComms', true, false)
        }
    })
})
