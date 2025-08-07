const should = require('should') // eslint-disable-line

const setup = require('../../setup')

const FF_UTIL = require('flowforge-test-utils')

const { Roles } = FF_UTIL.require('forge/lib/roles')

describe('Device Performance', function () {
    let app
    const TestObjects = { tokens: {} }

    before(async function () {
        app = await setup({ })
        await login('alice', 'aaPassword')

        app.device = await app.factory.createDevice({
            name: 'device1',
            mode: 'developer'
        }, app.team, app.instance)

        app.failingDevice = await app.factory.createDevice({
            name: 'failingDevice'
        }, app.team, app.instance)

        const userBob = await app.factory.createUser({
            username: 'bob',
            name: 'Bob',
            email: 'bob@example.com',
            password: 'bbPassword'
        })
        await login('bob', 'bbPassword')

        await app.team.addUser(userBob, { through : { role: Roles.Owner }})
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

    it('gets broker credentials', async function () {
        const response = await app.inject({
            method: 'POST',
            url: `/api/v1/devices/${app.device.hashid}/resources`,
            cookies: { sid: TestObjects.tokens.bob }
        })
        response.statusCode.should.equal(200)
        const result = JSON.parse(response.body)
        result.should.have.property('password')
        result.should.have.property('url')
        result.should.have.property('username')
    })
})