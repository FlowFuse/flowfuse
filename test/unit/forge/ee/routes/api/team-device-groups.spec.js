require('should') // eslint-disable-line
require('sinon')

const setup = require('../../setup.js')

const FF_UTIL = require('flowforge-test-utils')
const { Roles } = FF_UTIL.require('forge/lib/roles')

describe('Team Device Groups API', function () {
    let app
    /** @type {import('../../../../../lib/TestModelFactory')} */
    let factory = null
    let objectCount = 0
    const generateName = (root = 'object') => `${root}-${objectCount++}`

    const TestObjects = {
        /** admin - owns ateam */
        alice: {},
        /** owner of bteam */
        bob: {},
        /** member of b team */
        chris: {},
        /** not connected to any teams */
        dave: {},
        ATeam: {},
        BTeam: {},
        CTeam: {},
        /** B-team Application */
        application: {},
        /** B-team Instance */
        instance: {}
    }

    async function login (username, password) {
        const response = await app.inject({
            method: 'POST',
            url: '/account/login',
            payload: { username, password, remember: false }
        })
        response.cookies.should.have.length(1)
        response.cookies[0].should.have.property('name', 'sid')
        return response.cookies[0].value
    }

    before(async function () {
        app = await setup()
        factory = app.factory

        // Alice create in setup()
        TestObjects.alice = await app.db.models.User.byUsername('alice')
        TestObjects.bob = await app.db.models.User.create({ username: 'bob', name: 'Bob Solo', email: 'bob@example.com', email_verified: true, password: 'bbPassword' })
        TestObjects.chris = await app.db.models.User.create({ username: 'chris', name: 'Chris Crackers', email: 'chris@example.com', email_verified: true, password: 'ccPassword' })
        TestObjects.dave = await app.db.models.User.create({ username: 'dave', name: 'Dave Smith', email: 'dave@example.com', email_verified: true, password: 'ddPassword' })

        // ATeam create in setup()
        TestObjects.ATeam = await app.db.models.Team.byName('ATeam')

        // Need to give the default TeamType permission to use DeviceGroup feature
        const defaultTeamTypeProperties = app.defaultTeamType.properties
        defaultTeamTypeProperties.features.deviceGroups = true
        app.defaultTeamType.properties = defaultTeamTypeProperties
        await app.defaultTeamType.save()

        TestObjects.BTeam = await app.db.models.Team.create({ name: 'BTeam', TeamTypeId: app.defaultTeamType.id })
        TestObjects.CTeam = await app.db.models.Team.create({ name: 'CTeam', TeamTypeId: app.defaultTeamType.id })

        // alice : admin - owns ateam (setup)
        // bob - owner of bteam
        // chris - member of b team
        // dave - not connected to any teams
        await TestObjects.BTeam.addUser(TestObjects.bob, { through: { role: Roles.Owner } })
        await TestObjects.BTeam.addUser(TestObjects.chris, { through: { role: Roles.Member } })

        await TestObjects.CTeam.addUser(TestObjects.chris, { through: { role: Roles.Owner } })
        await TestObjects.CTeam.addUser(TestObjects.dave, { through: { role: Roles.Viewer } })
        await TestObjects.CTeam.addUser(TestObjects.bob, { through: { role: Roles.Member } })

        TestObjects.application = await app.db.models.Application.create({
            name: 'B-team Application',
            description: 'B-team Application description',
            TeamId: TestObjects.BTeam.id
        })
        TestObjects.instance = await app.factory.createInstance({ name: 'B-team-instance' }, TestObjects.application, app.stack, app.template, app.projectType, { start: false })
    })

    describe('the preHandler', () => {
        it('should return a 404 not found response when no team is provided', async () => {
            const sid = await login('bob', 'bbPassword')

            const response = await app.inject({
                method: 'GET',
                url: '/api/v1/teams//device-groups',
                cookies: { sid }
            })

            response.statusCode.should.equal(404)
        })

        it('should return a 404 not found response when the provided team is not found', async () => {
            const sid = await login('bob', 'bbPassword')

            const response = await app.inject({
                method: 'GET',
                url: '/api/v1/teams/noteam/device-groups',
                cookies: { sid }
            })

            response.statusCode.should.equal(404)
        })

        it('should return a 404 response when the user is not part of the requested team', async () => {
            const sid = await login('bob', 'bbPassword')

            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/teams/${TestObjects.ATeam.slug}/device-groups`,
                cookies: { sid }
            })

            response.statusCode.should.equal(404)
        })

        it('should not return a 404 response when the user is part of the requested team', async () => {
            const sid = await login('bob', 'bbPassword')
            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/teams/${TestObjects.BTeam.slug}/device-groups`,
                cookies: { sid }
            })
            response.statusCode.should.equal(200)
        })

        it('should not return a 404 response when the user is an admin', async () => {
            const sid = await login('alice', 'aaPassword')

            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/teams/${TestObjects.BTeam.slug}/device-groups`,
                cookies: { sid }
            })

            response.statusCode.should.equal(200)
        })
    })

    describe('Listing Team Device Groups', () => {
        it('should return a single application\'s device groups', async () => {
            const sid = await login('bob', 'bbPassword')
            const application = await factory.createApplication({ name: generateName('app') }, TestObjects.BTeam)

            const deviceGroup1 = await factory.createApplicationDeviceGroup({ name: 'dev-group-1' }, application)
            const deviceGroup2 = await factory.createApplicationDeviceGroup({ name: 'dev-group-2' }, application)

            const device1 = await factory.createDevice({ name: 'dev1' }, TestObjects.BTeam, null, application)
            await factory.addDeviceToGroup(device1, deviceGroup1)

            const device2 = await factory.createDevice({ name: 'dev2' }, TestObjects.BTeam, null, application)
            await factory.addDeviceToGroup(device2, deviceGroup2)

            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/teams/${TestObjects.BTeam.slug}/device-groups`,
                cookies: { sid }
            })

            response.statusCode.should.equal(200)

            const result = response.json()

            result.count.should.equal(2)
            result.groups[0].should.have.property('name', 'dev-group-1')
            result.groups[1].should.have.property('name', 'dev-group-2')
        })

        it('should return device groups from multiple applications belonging to the same team', async () => {
            const sid = await login('alice', 'aaPassword')
            const application1 = await factory.createApplication({ name: generateName('app') }, TestObjects.ATeam)
            const application2 = await factory.createApplication({ name: generateName('another-app') }, TestObjects.ATeam)

            const deviceGroup1 = await factory.createApplicationDeviceGroup({ name: 'dev-group-1' }, application1)
            const deviceGroup2 = await factory.createApplicationDeviceGroup({ name: 'dev-group-2' }, application1)
            const deviceGroup3 = await factory.createApplicationDeviceGroup({ name: 'dev-group-3' }, application2)
            const deviceGroup4 = await factory.createApplicationDeviceGroup({ name: 'dev-group-4' }, application2)

            const device1 = await factory.createDevice({ name: 'dev1' }, TestObjects.BTeam, null, application1)
            await factory.addDeviceToGroup(device1, deviceGroup1)

            const device2 = await factory.createDevice({ name: 'dev2' }, TestObjects.BTeam, null, application1)
            await factory.addDeviceToGroup(device2, deviceGroup2)

            const device3 = await factory.createDevice({ name: 'dev1' }, TestObjects.BTeam, null, application2)
            await factory.addDeviceToGroup(device3, deviceGroup3)

            const device4 = await factory.createDevice({ name: 'dev2' }, TestObjects.BTeam, null, application2)
            await factory.addDeviceToGroup(device4, deviceGroup4)

            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/teams/${TestObjects.ATeam.slug}/device-groups`,
                cookies: { sid }
            })

            response.statusCode.should.equal(200)

            const result = response.json()

            result.count.should.equal(4)
            result.groups[0].should.have.property('name', 'dev-group-1')
            result.groups[1].should.have.property('name', 'dev-group-2')
            result.groups[2].should.have.property('name', 'dev-group-3')
            result.groups[3].should.have.property('name', 'dev-group-4')
        })

        it('should not return device groups belonging to other teams', async () => {
            const sid = await login('chris', 'ccPassword')

            const aTeamApplication = await factory.createApplication({ name: generateName('app') }, TestObjects.ATeam)
            const bTeamApplication = await factory.createApplication({ name: generateName('app1') }, TestObjects.BTeam)
            const cTeamApplication = await factory.createApplication({ name: generateName('app') }, TestObjects.CTeam)

            const aTeamDeviceGroup = await factory.createApplicationDeviceGroup({ name: 'aTeam-dev-group' }, aTeamApplication)
            const bTeamDeviceGroup = await factory.createApplicationDeviceGroup({ name: 'bTeam-dev-group' }, bTeamApplication)
            const cTeamDeviceGroup = await factory.createApplicationDeviceGroup({ name: 'cTeam-dev-group' }, cTeamApplication)

            const aTeamDevice = await factory.createDevice({ name: 'dev1' }, TestObjects.BTeam, null, aTeamApplication)
            await factory.addDeviceToGroup(aTeamDevice, aTeamDeviceGroup)

            const bTeamDevice = await factory.createDevice({ name: 'dev2' }, TestObjects.BTeam, null, bTeamApplication)
            await factory.addDeviceToGroup(bTeamDevice, bTeamDeviceGroup)

            const cTeamDevice = await factory.createDevice({ name: 'dev3' }, TestObjects.CTeam, null, cTeamApplication)
            await factory.addDeviceToGroup(cTeamDevice, cTeamDeviceGroup)

            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/teams/${TestObjects.CTeam.slug}/device-groups`,
                cookies: { sid }
            })

            response.statusCode.should.equal(200)

            const result = response.json()

            result.count.should.equal(1)
            result.groups[0].should.have.property('name', 'cTeam-dev-group')
            result.groups.should.have.length(1)
        })

        it('should return a 200 response to admin roles', async () => {
            const sid = await login('alice', 'aaPassword')

            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/teams/${TestObjects.CTeam.slug}/device-groups`,
                cookies: { sid }
            })

            response.statusCode.should.equal(200)
        })

        it('should return a 200 response to owner roles', async () => {
            const sid = await login('chris', 'ccPassword')

            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/teams/${TestObjects.CTeam.slug}/device-groups`,
                cookies: { sid }
            })

            response.statusCode.should.equal(200)
        })

        it('should return a 200 response to member roles', async () => {
            const sid = await login('bob', 'bbPassword')

            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/teams/${TestObjects.CTeam.slug}/device-groups`,
                cookies: { sid }
            })

            response.statusCode.should.equal(200)
        })

        it('should return an unauthorized response for viewer roles', async () => {
            const sid = await login('dave', 'ddPassword')

            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/teams/${TestObjects.CTeam.slug}/device-groups`,
                cookies: { sid }
            })

            response.statusCode.should.equal(403)
        })
    })
})
