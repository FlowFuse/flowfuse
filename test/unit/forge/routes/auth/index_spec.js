const should = require('should') // eslint-disable-line
const setup = require('../setup')

describe('Accounts API', async function () {
    let app

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
