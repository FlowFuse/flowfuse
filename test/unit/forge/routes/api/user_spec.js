const should = require('should') // eslint-disable-line
const setup = require('../setup')
const FF_UTIL = require('flowforge-test-utils')
const { Roles } = FF_UTIL.require('forge/lib/roles')

describe('User API', async function () {
    let app
    const TestObjects = {}

    beforeEach(async function () {
        app = await setup({ features: { devices: true } })

        // alice : admin, team owner
        // bob
        // chris : (unverified_email)
        // dave : (password_expired)

        // ATeam ( alice  (owner), bob (owner), chris, dave)
        // BTeam ( bob (owner), chris, dave)

        // Alice create in setup()
        TestObjects.alice = await app.db.models.User.byUsername('alice')
        TestObjects.bob = await app.db.models.User.create({ username: 'bob', name: 'Bob Solo', email: 'bob@example.com', email_verified: true, password: 'bbPassword', admin: true })
        TestObjects.chris = await app.db.models.User.create({ username: 'chris', name: 'Chris Kenobi', email: 'chris@example.com', password: 'ccPassword' })
        TestObjects.dave = await app.db.models.User.create({ username: 'dave', name: 'Dave Vader', email: 'dave@example.com', password: 'ddPassword', email_verified: true, password_expired: true })

        // ATeam create in setup()
        TestObjects.ATeam = await app.db.models.Team.byName('ATeam')
        TestObjects.BTeam = await app.db.models.Team.create({ name: 'BTeam', TeamTypeId: app.defaultTeamType.id })

        // Alice set as ATeam owner in setup()
        await TestObjects.ATeam.addUser(TestObjects.bob, { through: { role: Roles.Owner } })
        await TestObjects.ATeam.addUser(TestObjects.chris, { through: { role: Roles.Member } })
        await TestObjects.ATeam.addUser(TestObjects.dave, { through: { role: Roles.Member } })
        await TestObjects.BTeam.addUser(TestObjects.bob, { through: { role: Roles.Owner } })
        await TestObjects.BTeam.addUser(TestObjects.chris, { through: { role: Roles.Member } })
        await TestObjects.BTeam.addUser(TestObjects.dave, { through: { role: Roles.Member } })

        TestObjects.Project1 = app.project

        TestObjects.tokens = {}
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

    describe('User settings', async function () {
        it('returns 401 on /user if not logged in', async function () {
            // await login('alice', 'aaPassword')
            // await login('bob', 'bbPassword')
            // await login('chris', 'ccPassword')
            const response = await app.inject({
                method: 'GET',
                url: '/api/v1/user'
            })
            response.statusCode.should.equal(401)
        })
        it('return user info for logged in user', async function () {
            await login('alice', 'aaPassword')
            const response = await app.inject({
                method: 'GET',
                url: '/api/v1/user',
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(200)
            const result = response.json()
            result.should.have.property('id', TestObjects.alice.hashid)
            result.should.have.property('username', TestObjects.alice.username)
            result.should.have.property('email', TestObjects.alice.email)
        })
        describe('Unverified Email', async function () {
            it('return user info for unverified_email user', async function () {
                await login('chris', 'ccPassword')
                const response = await app.inject({
                    method: 'GET',
                    url: '/api/v1/user',
                    cookies: { sid: TestObjects.tokens.chris }
                })
                response.statusCode.should.equal(200)
                const result = response.json()
                result.should.have.property('id', TestObjects.chris.hashid)
                result.should.have.property('username', TestObjects.chris.username)
                result.should.have.property('email', TestObjects.chris.email)
                result.should.have.property('email_verified', false)
            })
            it('cannot access other parts of api', async function () {
                // Not an exhaustive check by any means, but a simple check the
                // basic blocking is working
                await login('chris', 'ccPassword')
                const response = await app.inject({
                    method: 'GET',
                    url: '/api/v1/teams',
                    cookies: { sid: TestObjects.tokens.chris }
                })
                response.statusCode.should.equal(401)

                const response2 = await app.inject({
                    method: 'GET',
                    url: `/api/v1/projects/${TestObjects.Project1.id}`,
                    cookies: { sid: TestObjects.tokens.chris }
                })
                response2.statusCode.should.equal(401)
            })
        })
        describe('Password Expired', async function () {
            it('return user info for password_expired user', async function () {
                await login('dave', 'ddPassword')
                const response = await app.inject({
                    method: 'GET',
                    url: '/api/v1/user',
                    cookies: { sid: TestObjects.tokens.dave }
                })
                response.statusCode.should.equal(200)
                const result = response.json()
                result.should.have.property('id', TestObjects.dave.hashid)
                result.should.have.property('username', TestObjects.dave.username)
                result.should.have.property('email', TestObjects.dave.email)
                result.should.have.property('password_expired', true)
            })
            it('password_expired user can change password', async function () {
                await login('dave', 'ddPassword')
                const response = await app.inject({
                    method: 'PUT',
                    url: '/api/v1/user/change_password',
                    payload: {
                        old_password: 'ddPassword',
                        password: 'newDDPassword'
                    },
                    cookies: { sid: TestObjects.tokens.dave }
                })
                response.statusCode.should.equal(200)
                const result = response.json()
                result.should.have.property('status', 'okay')
            })

            it('cannot access other parts of api', async function () {
                // Not an exhaustive check by any means, but a simple check the
                // basic blocking is working
                await login('dave', 'ddPassword')
                const response = await app.inject({
                    method: 'GET',
                    url: '/api/v1/teams',
                    cookies: { sid: TestObjects.tokens.dave }
                })
                response.statusCode.should.equal(401)

                const response2 = await app.inject({
                    method: 'GET',
                    url: `/api/v1/projects/${TestObjects.Project1.id}`,
                    cookies: { sid: TestObjects.tokens.dave }
                })
                response2.statusCode.should.equal(401)
            })
        })
    })
})
