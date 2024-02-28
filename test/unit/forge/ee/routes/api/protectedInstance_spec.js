const TestModelFactory = require('../../../../../lib/TestModelFactory.js')
const setup = require('../../setup')

const FF_UTIL = require('flowforge-test-utils')
const { Roles } = FF_UTIL.require('forge/lib/roles')

describe('Protected Instance API', function () {
    const TestObjects = {
        tokens: {},
        /** @type {TestModelFactory} */
        factory: null
    }

    let app

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

    before(async function () {
        app = await setup()

        const factory = new TestModelFactory(app)
        TestObjects.factory = factory

        TestObjects.team = app.team
        TestObjects.application = app.application
        TestObjects.instance = app.instance

        const userBob = await TestObjects.factory.createUser({
            admin: false,
            username: 'bob',
            name: 'Bob Kenobi',
            email: 'bob@example.com',
            password: 'bbPassword'
        })
        await TestObjects.team.addUser(userBob, { through: { role: Roles.Member } })

        await login('alice', 'aaPassword')
        await login('bob', 'bbPassword')
    })

    after(async function () {
        app.close()
    })

    it('allow Owner to change protected status', async function () {
        const response = await app.inject({
            method: 'PUT',
            url: `/api/v1/projects/${TestObjects.instance.id}/protectInstance`,
            body: { enabled: true },
            cookies: { sid: TestObjects.tokens.alice }
        })
        response.statusCode.should.equal(200)
    })
    it('forbid Member to change protected status', async function () {
        const response = await app.inject({
            method: 'PUT',
            url: `/api/v1/projects/${TestObjects.instance.id}/protectInstance`,
            body: { enabled: true },
            cookies: { sid: TestObjects.tokens.bob }
        })
        response.statusCode.should.equal(403)
    })
    it('allow Owner to clear protected status', async function () {
        const response = await app.inject({
            method: 'DELETE',
            url: `/api/v1/projects/${TestObjects.instance.id}/protectInstance`,
            cookies: { sid: TestObjects.tokens.alice }
        })
        response.statusCode.should.equal(200)
    })
    it('forbid Member to clear protected status', async function () {
        const response = await app.inject({
            method: 'DELETE',
            url: `/api/v1/projects/${TestObjects.instance.id}/protectInstance`,
            cookies: { sid: TestObjects.tokens.bob }
        })
        response.statusCode.should.equal(403)
    })
    it('allow Member to read protected status', async function () {
        const response = await app.inject({
            method: 'GET',
            url: `/api/v1/projects/${TestObjects.instance.id}/protectInstance`,
            cookies: { sid: TestObjects.tokens.bob }
        })
        response.statusCode.should.equal(200)
    })
})
