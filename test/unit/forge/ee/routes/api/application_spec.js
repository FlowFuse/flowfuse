const should = require('should') // eslint-disable-line
const sinon = require('sinon')

const setup = require('../../setup.js')

const FF_UTIL = require('flowforge-test-utils')
const { Roles } = FF_UTIL.require('forge/lib/roles')

describe('Application API', function () {
    let app
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
        /** B-team Application */
        application: {},
        /** B-team Instance */
        instance: {},
        /** B-team Instance device */
        device1: {},
        /** B-team Application Device */
        device2: {}

    }
    /** @type {import('../../../../../lib/TestModelFactory')} */
    let factory = null
    let objectCount = 0
    const generateName = (root = 'object') => `${root}-${objectCount++}`

    before(async function () {
        app = await setup()
        factory = app.factory

        // ATeam ( alice  (owner), bob )
        // BTeam ( bob (owner), chris )

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
        defaultTeamTypeProperties.features.bom = true
        app.defaultTeamType.properties = defaultTeamTypeProperties
        await app.defaultTeamType.save()
        TestObjects.BTeam = await app.db.models.Team.create({ name: 'BTeam', TeamTypeId: app.defaultTeamType.id })

        // alice : admin - owns ateam (setup)
        // bob - owner of bteam
        // chris - member of b team
        // dave - not connected to any teams
        await TestObjects.BTeam.addUser(TestObjects.bob, { through: { role: Roles.Owner } })
        await TestObjects.BTeam.addUser(TestObjects.chris, { through: { role: Roles.Member } })

        TestObjects.application = await app.db.models.Application.create({
            name: 'B-team Application',
            description: 'B-team Application description',
            TeamId: TestObjects.BTeam.id
        })
        TestObjects.instance = await factory.createInstance({ name: generateName('B-team-instance') }, TestObjects.application, app.stack, app.template, app.projectType, { start: false })
        TestObjects.device1 = await factory.createDevice({ name: generateName('device') }, TestObjects.ATeam, TestObjects.instance, null)
        TestObjects.device2 = await factory.createDevice({ name: generateName('device') }, TestObjects.BTeam, null, TestObjects.application)

        // fake the instance `versions` to test BOM
        await TestObjects.instance.update({ versions: { 'node-red': { wanted: '4.0.3', current: '4.0.2' } } })
    })

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

    after(async function () {
        await app.close()
    })

    beforeEach(async function () {
        sinon.stub(app.comms.devices, 'sendCommand').resolves()
    })

    afterEach(async function () {
        app.comms.devices.sendCommand.restore()
    })

    describe('BOM', async function () {
        it('Owner can get Application BOM', async function () {
            const sid = await login('bob', 'bbPassword')

            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/applications/${TestObjects.application.hashid}/bom`,
                cookies: { sid }
            })

            response.statusCode.should.equal(200)

            const depsCheck = (item) => {
                should(item.dependencies).be.an.Array()
                item.dependencies.forEach(dep => {
                    should(dep).be.an.Object()
                    dep.should.have.properties('name', 'version')
                    dep.version.should.have.properties('wanted', 'current')
                })
            }

            const result = response.json()
            should(result).be.an.Object()
            result.should.have.properties('id', 'name', 'children')
            result.id.should.equal(TestObjects.application.hashid)
            result.name.should.equal(TestObjects.application.name)
            result.children.should.be.an.Array().and.have.length(3)

            const instance = result.children.find(c => c.type === 'instance' && c.id === TestObjects.instance.id)
            should(instance).be.an.Object()
            instance.should.have.property('name', TestObjects.instance.name)
            instance.should.have.property('type', 'instance')
            instance.dependencies.should.matchAny({ name: 'node-red', version: { wanted: '4.0.3', current: '4.0.2' } })
            depsCheck(instance)

            const device1 = result.children.find(c => c.type === 'device' && c.id === TestObjects.device1.hashid)
            should(device1).be.an.Object()
            device1.should.have.property('name', TestObjects.device1.name)
            device1.should.have.property('ownerType', 'instance')
            device1.should.have.property('ownerId', TestObjects.instance.id)
            depsCheck(device1)

            const device2 = result.children.find(c => c.type === 'device' && c.id === TestObjects.device2.hashid)
            should(device2).be.an.Object()
            device2.should.have.property('name', TestObjects.device2.name)
            device2.should.have.property('ownerType', 'application')
            device2.should.have.property('ownerId', TestObjects.application.hashid)
            depsCheck(device2)
        })

        // 401 means not logged in where as 403 means logged in but not authorized
        it('Non Owner can not get BOM (403)', async function () {
            const sid = await login('chris', 'ccPassword')
            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/applications/${TestObjects.application.hashid}/bom`,
                cookies: { sid }
            })

            response.statusCode.should.equal(403)
        })

        it('Non Member can not get BOM (404)', async function () {
            const sid = await login('dave', 'ddPassword')
            const response = await app.inject({
                method: 'GET',
                url: `/api/v1/applications/${TestObjects.application.hashid}/bom`,
                cookies: { sid }
            })

            response.statusCode.should.equal(404)
        })
    })
})
