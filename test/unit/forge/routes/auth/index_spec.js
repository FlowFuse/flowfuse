const should = require('should') // eslint-disable-line
const setup = require('../setup')

describe('Accounts API', async function () {
    let app
    const TestObjects = { tokens: {} }

    afterEach(async function () {
        if (app) {
            await app.close()
            app = null
        }
    })

    async function registerUser (payload) {
        return app.inject({
            method: 'POST',
            url: '/account/register',
            payload
        })
    }

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

    describe('Register User', async function () {
        async function expectRejection (opts, reason) {
            const response = await registerUser(opts)
            response.statusCode.should.equal(400)
            response.json().error.should.match(reason)
        }

        it('rejects user registration if not enabled', async function () {
            app = await setup()
            app.settings.get('user:signup').should.be.false()
            app.settings.get('team:user:invite:external').should.be.false()
            await expectRejection({
                username: 'u1',
                password: 'p1',
                name: 'u1',
                email: 'u1@example.com'
            }, /user registration not enabled/)

            // TODO: check user audit logs - expect 'account.xxx-yyy' { code: '', error, '' }
        })
        it('allows user to register', async function () {
            app = await setup()
            app.settings.set('user:signup', true)

            const response = await registerUser({
                username: 'u1',
                password: '12345678',
                name: 'u1',
                email: 'u1@example.com'
            })
            response.statusCode.should.equal(200)
            const result = response.json()
            result.should.have.property('username', 'u1')
            result.should.have.property('id')
            // Ensure the id looks like a hash id
            result.id.should.not.match(/^\d+$/)
            // TODO: check user audit logs - expect 'account.xxx-yyy' { status: 'okay', ... }
        })

        it('rejects reserved user names', async function () {
            app = await setup()
            app.settings.set('user:signup', true)

            await expectRejection({
                username: 'admin',
                password: '12345678',
                name: 'u1',
                email: 'u1@example.com'
            }, /invalid username/)

            await expectRejection({
                username: 'root',
                password: '12345678',
                name: 'u1',
                email: 'u1@example.com'
            }, /invalid username/)

            // TODO: check user audit logs - expect 'account.xxx-yyy' { code: '', error, '' }
        })

        it('rejects duplicate username', async function () {
            app = await setup()
            app.settings.set('user:signup', true)

            await registerUser({
                username: 'u1',
                password: '12345678',
                name: 'u1',
                email: 'u1@example.com'
            })

            await expectRejection({
                username: 'u1',
                password: '12345678',
                name: 'u1.2',
                email: 'u1-2@example.com'
            }, /username not available/)

            // TODO: check user audit logs - expect 'account.xxx-yyy' { code: '', error, '' }
        })
        it('rejects duplicate email', async function () {
            app = await setup()
            app.settings.set('user:signup', true)

            await registerUser({
                username: 'u1',
                password: '12345678',
                name: 'u1',
                email: 'u1@example.com'
            })

            await expectRejection({
                username: 'u1-2',
                password: '12345678',
                name: 'u1.2',
                email: 'u1@example.com'
            }, /email not available/)

            // TODO: check user audit logs - expect 'account.xxx-yyy' { code: '', error, '' }
        })

        it('limits how many users can be created according to license', async function () {
            // This license has limit of 5 users (1 created by default test setup (test/unit/forge/routes/setup.js))
            const license = 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJGbG93Rm9yZ2UgSW5jLiIsInN1YiI6IkZsb3dGb3JnZSBJbmMuIERldmVsb3BtZW50IiwibmJmIjoxNjYyNTA4ODAwLCJleHAiOjc5ODY5ODg3OTksIm5vdGUiOiJEZXZlbG9wbWVudC1tb2RlIE9ubHkuIE5vdCBmb3IgcHJvZHVjdGlvbiIsInVzZXJzIjo1LCJ0ZWFtcyI6NTAsInByb2plY3RzIjo1MCwiZGV2aWNlcyI6NTAsImRldiI6dHJ1ZSwiaWF0IjoxNjYyNTQ4NjAyfQ.vvSw6pm-NP5e0NUL7yMOG-w0AgB8H3NRGGN7b5Dw_iW5DiIBbVQ4HVLEi3dyy9fk7WgKnloiCCkIFJvN79fK_g'
            app = await setup({ license })
            app.settings.set('user:signup', true)
            // Register 4 more users to reach the limit
            for (let i = 1; i <= 4; i++) {
                const resp = await registerUser({
                    username: `u${i}`,
                    password: '12345678',
                    name: `u${i}`,
                    email: `u${i}@example.com`
                })
                resp.statusCode.should.equal(200)
            }
            await expectRejection({
                username: 'u6',
                password: '12345678',
                name: 'u6',
                email: 'u6@example.com'
            }, /license limit reached/)

            // TODO: check user audit logs - expect 'account.xxx-yyy' { code: '', error, '' }
        })

        it('allows user to register with + in email (no sso)', async function () {
            app = await setup()
            app.settings.set('user:signup', true)

            const response = await registerUser({
                username: 'u7',
                password: '12345678',
                name: 'u7',
                email: 'u7+test@example.com'
            })
            response.statusCode.should.equal(200)

            // TODO: check user audit logs - expect 'account.xxx-yyy' { status: 'okay', ... }
        })

        it('auto-creates personal team if option set', async function () {
            app = await setup()
            app.settings.set('user:signup', true)
            app.settings.set('user:team:auto-create', true)

            const response = await registerUser({
                username: 'user',
                password: '12345678',
                name: 'user',
                email: 'user@example.com'
            })
            response.statusCode.should.equal(200)

            // Team is only created once they verify their email.
            const user = await app.db.models.User.findOne({ where: { username: 'user' } })
            const verificationToken = await app.db.controllers.User.generateEmailVerificationToken(user)
            await app.inject({
                method: 'POST',
                url: `/account/verify/${verificationToken}`,
                payload: {},
                cookies: { sid: TestObjects.tokens.user }
            })
            await login('user', '12345678')

            const userTeamsResponse = await app.inject({
                method: 'GET',
                url: '/api/v1/user/teams',
                cookies: { sid: TestObjects.tokens.user }
            })

            const userTeams = userTeamsResponse.json()
            userTeams.should.have.property('teams')
            userTeams.teams.should.have.length(1)
        })

        it('auto-creates personal team if option set - in trial mode', async function () {
            const license = 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJGbG93Rm9yZ2UgSW5jLiIsInN1YiI6IkZsb3dGb3JnZSBJbmMuIERldmVsb3BtZW50IiwibmJmIjoxNjYyNTA4ODAwLCJleHAiOjc5ODY5ODg3OTksIm5vdGUiOiJEZXZlbG9wbWVudC1tb2RlIE9ubHkuIE5vdCBmb3IgcHJvZHVjdGlvbiIsInVzZXJzIjo1LCJ0ZWFtcyI6NTAsInByb2plY3RzIjo1MCwiZGV2aWNlcyI6NTAsImRldiI6dHJ1ZSwiaWF0IjoxNjYyNTQ4NjAyfQ.vvSw6pm-NP5e0NUL7yMOG-w0AgB8H3NRGGN7b5Dw_iW5DiIBbVQ4HVLEi3dyy9fk7WgKnloiCCkIFJvN79fK_g'
            const TEST_TRIAL_DURATION = 5
            const TEST_TRIAL_DURATION_MS = TEST_TRIAL_DURATION * 1000 * 60 * 60 * 24
            app = await setup({ license, billing: { stripe: {} } })
            app.settings.set('user:signup', true)
            app.settings.set('user:team:auto-create', true)
            app.settings.set('user:team:trial-mode', true)
            app.settings.set('user:team:trial-mode:duration', TEST_TRIAL_DURATION)

            const response = await registerUser({
                username: 'user',
                password: '12345678',
                name: 'user',
                email: 'user@example.com'
            })
            response.statusCode.should.equal(200)

            // Team is only created once they verify their email.
            const user = await app.db.models.User.findOne({ where: { username: 'user' } })
            const verificationToken = await app.db.controllers.User.generateEmailVerificationToken(user)
            await app.inject({
                method: 'POST',
                url: `/account/verify/${verificationToken}`,
                payload: {},
                cookies: { sid: TestObjects.tokens.user }
            })
            await login('user', '12345678')

            const userTeamsResponse = await app.inject({
                method: 'GET',
                url: '/api/v1/user/teams',
                cookies: { sid: TestObjects.tokens.user }
            })

            const userTeams = userTeamsResponse.json()
            userTeams.should.have.property('teams')
            userTeams.teams.should.have.length(1)

            userTeams.teams[0].should.have.property('trialEndsAt')
            ;(new Date(userTeams.teams[0].trialEndsAt) - Date.now()).should.be.within(TEST_TRIAL_DURATION_MS - 5000, TEST_TRIAL_DURATION_MS)
        })
    })

    describe('Verify FF Tokens', async function () {
        it('Test token belongs to a project', async function () {
            app = await setup()
            const authTokens = await app.project.refreshAuthTokens()
            const response = await app.inject({
                method: 'GET',
                url: `/account/check/project/${app.project.id}`,
                headers: {
                    authorization: `Bearer ${authTokens.token}`
                }
            })
            response.statusCode.should.equal(200)
        })

        it('Fail to verify with random project id', async function () {
            app = await setup()
            const authTokens = await app.project.refreshAuthTokens()
            const response = await app.inject({
                method: 'GET',
                url: '/account/check/project/random',
                headers: {
                    authorization: `Bearer ${authTokens.token}`
                }
            })
            response.statusCode.should.equal(401)
        })

        it('Fail to verify with random project id', async function () {
            app = await setup()
            const authTokens = await app.project.refreshAuthTokens()
            const response = await app.inject({
                method: 'GET',
                url: `/account/check/team/${app.project.id}`,
                headers: {
                    authorization: `Bearer ${authTokens.token}`
                }
            })
            response.statusCode.should.equal(401)
        })
    })
})
