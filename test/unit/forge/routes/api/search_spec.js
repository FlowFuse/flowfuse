const Sinon = require('sinon')
const should = require('should') // eslint-disable-line
const setup = require('../setup')

const FF_UTIL = require('flowforge-test-utils')
const { Roles } = FF_UTIL.require('forge/lib/roles')

describe('Search API', function () {
    let app
    const TestObjects = {}

    async function setupApp (license) {
        app = await setup()
        app.license.defaults.instances = 20 // override default

        // Create team to search in
        TestObjects.BTeam = await app.db.models.Team.create({ name: 'BTeam', TeamTypeId: app.defaultTeamType.id })

        // Alice create in setup() - admin
        TestObjects.alice = await app.db.models.User.byUsername('alice')
        // Bob - BTeam owner
        TestObjects.bob = await app.db.models.User.create({ username: 'bob', name: 'Bob Solo', email: 'bob@example.com', email_verified: true, password: 'bbPassword' })
        await TestObjects.BTeam.addUser(TestObjects.bob, { through: { role: Roles.Owner } })
        // Chris - BTeam dashboard
        TestObjects.chris = await app.db.models.User.create({ username: 'chris', name: 'Chris Kenobi', email: 'chris@example.com', email_verified: true, password: 'ccPassword' })
        await TestObjects.BTeam.addUser(TestObjects.chris, { through: { role: Roles.Dashboard } })
        // Dave -  not a member
        TestObjects.dave = await app.db.models.User.create({ username: 'dave', name: 'Dave Kenobi', email: 'dave@example.com', email_verified: true, password: 'ddPassword' })

        TestObjects.tokens = {}
        await login('alice', 'aaPassword')
        await login('bob', 'bbPassword')
        await login('chris', 'ccPassword')
        await login('dave', 'ddPassword')

        // BTeam
        //  - [app] "Application One"
        //     - [inst] "instance-app-one-abc"
        //     - [inst] "instance-app-one-def"
        //       - [dev] "device-app-one-instance-one-ghi"
        //     - [dev] "device-app-one-abc"
        //     - [dev] "device-app-one-def"
        //  - [app] "Application Two"
        //     - [inst] "instance-app-two-abc"
        //     - [inst] "instance-app-two-def"
        //     - [dev] "device-app-two-abc"
        //     - [dev] "device-app-two-def"
        //  - [dev] "device-unassigned-abc"
        //  - [app] "Application AbC"

        TestObjects.AppOne = await app.factory.createApplication({ name: 'Application One', description: 'app-one-desc' }, TestObjects.BTeam)

        TestObjects.App1Instance1 = await app.factory.createInstance({ name: 'instance-app-one-abc' }, TestObjects.AppOne, app.stack, app.template, app.projectType, { start: false })
        await app.factory.createInstance({ name: 'instance-app-one-def' }, TestObjects.AppOne, app.stack, app.template, app.projectType, { start: false })
        TestObjects.App1Instance1Device1 = await app.factory.createDevice({ name: 'device-app-one-instance-one-ghi' }, TestObjects.BTeam, TestObjects.App1Instance1)
        await app.factory.createDevice({ name: 'device-app-one-abc' }, TestObjects.BTeam, null, TestObjects.AppOne)
        await app.factory.createDevice({ name: 'device-app-one-def' }, TestObjects.BTeam, null, TestObjects.AppOne)

        TestObjects.AppTwo = await app.factory.createApplication({ name: 'Application Two' }, TestObjects.BTeam)
        await app.factory.createInstance({ name: 'instance-app-two-abc' }, TestObjects.AppTwo, app.stack, app.template, app.projectType, { start: false })
        await app.factory.createInstance({ name: 'instance-app-two-def' }, TestObjects.AppTwo, app.stack, app.template, app.projectType, { start: false })
        await app.factory.createDevice({ name: 'device-app-two-abc' }, TestObjects.BTeam, null, TestObjects.AppTwo)
        await app.factory.createDevice({ name: 'device-app-two-def', type: 'device-type' }, TestObjects.BTeam, null, TestObjects.AppTwo)

        await app.factory.createDevice({ name: 'device-unassigned-abc' }, TestObjects.BTeam)

        await app.factory.createApplication({ name: 'Application AbC' }, TestObjects.BTeam)
    }

    before(async function () {
        await setupApp()
    })

    after(async function () {
        await app.close()
    })

    afterEach(function () {
        Sinon.restore()
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

    async function search (query, token) {
        return await app.inject({
            method: 'GET',
            url: '/api/v1/search',
            cookies: { sid: token },
            query

        })
    }

    it('search requires a team to be specified', async function () {
        const response = await search({ query: 'abc' }, TestObjects.tokens.alice)
        response.statusCode.should.equal(400)
        const result = response.json()
        ;/required property 'team'/.test(result.message).should.be.true()
    })

    it('search with invalid team returns no results', async function () {
        {
            const response = await search({ team: 'notvalid', query: 'abc' }, TestObjects.tokens.alice)
            response.statusCode.should.equal(200)
            const result = response.json()
            result.count.should.equal(0)
            result.results.should.have.length(0)
        }

        {
            const response = await search({ team: 1, query: 'abc' }, TestObjects.tokens.alice)
            response.statusCode.should.equal(200)
            const result = response.json()
            result.count.should.equal(0)
            result.results.should.have.length(0)
        }
    })

    it('search by non-team member returns no results', async function () {
        // dave - not a team member
        const response = await search({ team: TestObjects.BTeam.hashid, query: 'abc' }, TestObjects.tokens.dave)
        response.statusCode.should.equal(200)
        const result = response.json()
        result.count.should.equal(0)
        result.results.should.have.length(0)
    })

    it('search by dashboard-team member returns no results', async function () {
        // chris - dashboard team member
        const response = await search({ team: TestObjects.BTeam.hashid, query: 'abc' }, TestObjects.tokens.chris)
        response.statusCode.should.equal(200)
        const result = response.json()
        result.count.should.equal(0)
        result.results.should.have.length(0)
    })

    it('search by admin non-team member returns results', async function () {
        // alice - admin non-team member
        const response = await search({ team: TestObjects.BTeam.hashid, query: 'abc' }, TestObjects.tokens.alice)
        response.statusCode.should.equal(200)
        const result = response.json()
        result.count.should.equal(6)
        result.results.should.have.length(6)
    })

    it('search by team member returns results', async function () {
        // bob - team member
        const response = await search({ team: TestObjects.BTeam.hashid, query: 'abc' }, TestObjects.tokens.bob)
        response.statusCode.should.equal(200)
        const result = response.json()
        result.count.should.equal(6)
        result.results.should.have.length(6)
        // Map results to name->object for ease of checking
        const objects = {}
        result.results.forEach(obj => {
            objects[obj.name] = obj
        })

        objects.should.have.property('instance-app-one-abc')
        objects['instance-app-one-abc'].should.have.property('object', 'instance')
        objects.should.have.property('device-app-one-abc')
        objects['device-app-one-abc'].should.have.property('object', 'device')
        objects.should.have.property('instance-app-two-abc')
        objects['instance-app-two-abc'].should.have.property('object', 'instance')
        objects.should.have.property('device-app-two-abc')
        objects['device-app-two-abc'].should.have.property('object', 'device')
        objects.should.have.property('device-unassigned-abc')
        objects['device-unassigned-abc'].should.have.property('object', 'device')
        objects.should.have.property('Application AbC')
        objects['Application AbC'].should.have.property('object', 'application')
    })

    it('search includes application description', async function () {
        // bob - team member
        const response = await search({ team: TestObjects.BTeam.hashid, query: 'ne-deSC' }, TestObjects.tokens.bob)
        response.statusCode.should.equal(200)
        const result = response.json()
        result.count.should.equal(1)
        result.results.should.have.length(1)
        result.results[0].should.have.property('object', 'application')
    })

    it('search includes device type', async function () {
        // bob - team member
        const response = await search({ team: TestObjects.BTeam.hashid, query: 'ice-Typ' }, TestObjects.tokens.bob)
        response.statusCode.should.equal(200)
        const result = response.json()
        result.count.should.equal(1)
        result.results.should.have.length(1)
        result.results[0].should.have.property('object', 'device')
    })

    it('search by application id returns only one application & does not query other tables', async function () {
        // bob - team member
        Sinon.spy(app.db.models.Application, 'byTeam')
        Sinon.spy(app.db.models.Project, 'byTeam')
        Sinon.spy(app.db.models.Device, 'byTeam')

        const response = await search({ team: TestObjects.BTeam.hashid, query: TestObjects.AppOne.hashid }, TestObjects.tokens.bob)
        response.statusCode.should.equal(200)
        const result = response.json()
        result.count.should.equal(1)
        result.results.should.have.length(1)
        result.results[0].should.have.property('object', 'application')

        app.db.models.Application.byTeam.called.should.be.true()
        app.db.models.Project.byTeam.called.should.be.false()
        app.db.models.Device.byTeam.called.should.be.false()

        // ensure query was not passed to byTeam & that applicationId was passed
        const args = app.db.models.Application.byTeam.getCall(0).args
        args[1].should.not.have.property('query')
        args[1].should.have.property('applicationId', TestObjects.AppOne.id) // actual id, not hashid
    })

    it('search by instance id returns only one instance & does not query other tables', async function () {
        // bob - team member
        Sinon.spy(app.db.models.Application, 'byTeam')
        Sinon.spy(app.db.models.Project, 'byTeam')
        Sinon.spy(app.db.models.Device, 'byTeam')

        const response = await search({ team: TestObjects.BTeam.hashid, query: TestObjects.App1Instance1.id }, TestObjects.tokens.bob)
        response.statusCode.should.equal(200)
        const result = response.json()
        result.count.should.equal(1)
        result.results.should.have.length(1)
        result.results[0].should.have.property('object', 'instance')

        app.db.models.Application.byTeam.called.should.be.false()
        app.db.models.Project.byTeam.called.should.be.true()
        app.db.models.Device.byTeam.called.should.be.false()

        // ensure query was not passed to byTeam & that instanceId was passed
        const args = app.db.models.Project.byTeam.getCall(0).args
        args[1].should.not.have.property('query')
        args[1].should.have.property('instanceId', TestObjects.App1Instance1.id)
    })

    it('search by device id returns only one device & does not query other tables', async function () {
        // bob - team member
        Sinon.spy(app.db.models.Application, 'byTeam')
        Sinon.spy(app.db.models.Project, 'byTeam')
        Sinon.spy(app.db.models.Device, 'byTeam')

        const response = await search({ team: TestObjects.BTeam.hashid, query: TestObjects.App1Instance1Device1.hashid }, TestObjects.tokens.bob)
        response.statusCode.should.equal(200)
        const result = response.json()
        result.count.should.equal(1)
        result.results.should.have.length(1)
        result.results[0].should.have.property('object', 'device')

        app.db.models.Application.byTeam.called.should.be.false()
        app.db.models.Project.byTeam.called.should.be.false()
        app.db.models.Device.byTeam.called.should.be.true()

        // ensure query was not passed to byTeam & that deviceId was passed
        const args = app.db.models.Device.byTeam.getCall(0).args
        args[1].should.not.have.property('query')
        args[1].should.have.property('deviceId', TestObjects.App1Instance1Device1.id)
    })

    it('search with blank query returns nothing', async function () {
        // bob - team member
        const response = await search({ team: TestObjects.BTeam.hashid, query: '' }, TestObjects.tokens.bob)
        response.statusCode.should.equal(200)
        const result = response.json()
        result.count.should.equal(0)
        result.results.should.have.length(0)
    })

    it('search is case-insensitive', async function () {
        // bob - team member
        const response = await search({ team: TestObjects.BTeam.hashid, query: 'oNe' }, TestObjects.tokens.bob)
        response.statusCode.should.equal(200)
        const result = response.json()
        result.count.should.equal(6)
        result.results.should.have.length(6)
    })

    it('returns 400 if team query param is missing', async function () {
        const response = await app.inject({
            method: 'GET',
            url: '/api/v1/search/instances',
            query: { query: 'abc' }
        })
        response.statusCode.should.equal(400)
        const result = response.json()
        result.should.have.property('code', 'FST_ERR_VALIDATION') // Adjusted expected code
        result.should.have.property('message', 'querystring must have required property \'team\'') // Match actual message
    })

    it('returns 403 if user lacks permission to search the team', async function () {
        const teamHashId = app.db.models.Team.encodeHashid(TestObjects.BTeam.id)
        const response = await app.inject({
            method: 'GET',
            url: '/api/v1/search/instances',
            query: { team: teamHashId, query: 'abc' },
            cookies: { sid: TestObjects.tokens.dave } // Non-team member
        })
        response.statusCode.should.equal(403)
        const result = response.json()
        result.should.have.property('code', 'unauthorized')
        result.should.have.property('error', 'unauthorized')
    })

    it('returns hosted and remote instances for valid team and query', async function () {
        const teamHashId = app.db.models.Team.encodeHashid(TestObjects.BTeam.id)
        const response = await app.inject({
            method: 'GET',
            url: '/api/v1/search/instances',
            query: { team: teamHashId, query: 'instance' },
            cookies: { sid: TestObjects.tokens.bob } // Team member
        })
        response.statusCode.should.equal(200)
        const result = response.json()
        result.count.should.be.greaterThan(0)
        result.results.should.be.an.Array()
        result.results.forEach(item => {
            item.should.have.property('instanceType')
            ;['hosted', 'remote'].should.containEql(item.instanceType)
        })
    })

    it('returns empty results for valid team but blank query', async function () {
        const teamHashId = app.db.models.Team.encodeHashid(TestObjects.BTeam.id)
        const response = await app.inject({
            method: 'GET',
            url: '/api/v1/search/instances',
            query: { team: teamHashId, query: '' },
            cookies: { sid: TestObjects.tokens.bob } // Team member
        })
        response.statusCode.should.equal(200)
        const result = response.json()
        result.count.should.equal(0)
        result.results.should.have.length(0)
    })
})
