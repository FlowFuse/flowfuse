const crypto = require('crypto')

const should = require('should') // eslint-disable-line

const setup = require('../setup')

const FF_UTIL = require('flowforge-test-utils')
const { base64URLEncode } = FF_UTIL.require('forge/db/utils')

describe('OAuth', async function () {
    let app
    const TestObjects = { tokens: {} }

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

    describe('Editor auth', async function () {
        const callbackURL = 'http://localhost:9999/auth/strategy/callback'
        const authorizationURL = 'http://localhost:3000/account/authorize'
        const tokenURL = '/account/token'
        const userInfoURL = '/api/v1/user'

        before(async function () {
            app = await setup({
                license: 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJGbG93Rm9yZ2UgSW5jLiIsInN1YiI6IkZsb3dGb3JnZSBJbmMuIERldmVsb3BtZW50IiwibmJmIjoxNjYyNDIyNDAwLCJleHAiOjc5ODY5MDIzOTksIm5vdGUiOiJEZXZlbG9wbWVudC1tb2RlIE9ubHkuIE5vdCBmb3IgcHJvZHVjdGlvbiIsInVzZXJzIjoxNTAsInRlYW1zIjo1MCwicHJvamVjdHMiOjUwLCJkZXZpY2VzIjo1MCwiZGV2Ijp0cnVlLCJpYXQiOjE2NjI0ODI5ODd9.e8Jeppq4aURwWYz-rEpnXs9RY2Y7HF7LJ6rMtMZWdw2Xls6-iyaiKV1TyzQw5sUBAhdUSZxgtiFH5e_cNJgrUg'
            })
            TestObjects.bob = await app.factory.createUser({
                username: 'bob',
                name: 'Bob Fett',
                email: 'bob@example.com',
                password: 'bbPassword'
            })
            await login('bob', 'bbPassword')
        })
        afterEach(async function () {
            await app.db.models.TeamMember.destroy({ where: { UserId: TestObjects.bob.id } })
        })
        after(async function () {
            await app.close()
        })

        function generateOAuthRequest (opts) {
            const verifier = base64URLEncode(crypto.randomBytes(32))
            const params = {}
            params.client_id = opts.clientID
            params.scope = opts.scope || 'editor-0.0.0'
            params.response_type = 'code'
            params.state = ''
            params.code_challenge = base64URLEncode(crypto.createHash('sha256').update(verifier).digest())
            params.code_challenge_method = 'S256'
            params.redirect_uri = opts.callbackURL || callbackURL
            const authURL = new URL(authorizationURL)
            authURL.search = new URLSearchParams(params)
            return {
                verifier,
                authURL
            }
        }

        async function runFullLogin (user) {
            const instanceCreds = await app.project.refreshAuthTokens()
            const clientID = instanceCreds.clientID

            // 1. Initial request
            const requestOptions = generateOAuthRequest({ clientID })
            const response = await app.inject({
                method: 'GET',
                url: requestOptions.authURL,
                cookies: { sid: TestObjects.tokens[user.username] }
            })
            response.should.have.property('statusCode', 302)
            response.headers.should.have.property('location')
            const m = /(\/account\/complete\/[^/]+)$/.exec(response.headers.location)
            should.exist(m, 'location header format incorrect: ' + response.headers.location)

            // 2. Follow the redirect from step 1
            const completeUrl = m[1]
            const response2 = await app.inject({
                method: 'GET',
                url: completeUrl,
                cookies: { sid: TestObjects.tokens[user.username] }
            })
            response2.should.have.property('statusCode', 302)
            response2.headers.should.have.property('location')

            const callbackUrl = new URL(response2.headers.location)
            callbackUrl.host.should.equal('localhost:9999')
            callbackUrl.pathname.should.equal('/auth/strategy/callback')
            should.exist(callbackUrl.searchParams.get('code'))
            should.exist(callbackUrl.searchParams.get('state'))

            // 3. Exhange code for token
            const response3 = await app.inject({
                url: tokenURL,
                method: 'POST',
                payload: {
                    grant_type: 'authorization_code',
                    code: callbackUrl.searchParams.get('code'),
                    redirect_uri: callbackURL,
                    client_id: clientID,
                    code_verifier: requestOptions.verifier
                }
            })
            response3.should.have.property('statusCode', 200)
            const result = response3.json()
            result.should.have.property('access_token')
            result.should.have.property('expires_in')
            result.should.have.property('refresh_token')
            result.should.have.property('scope')

            // 4. Verify the token works
            const userInfoResponse = await app.inject({
                url: userInfoURL,
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${result.access_token}`
                }
            })
            userInfoResponse.should.have.property('statusCode', 200)
            const userInfo = userInfoResponse.json()
            userInfo.should.have.property('username', user.username)

            // 5. Verify the token cannot modify the user
            //    - this is a sniff test to ensure the token has a reduced scope
            const userUpdateResponse = await app.inject({
                url: userInfoURL,
                method: 'PUT',
                payload: { name: 'Fred' },
                headers: {
                    Authorization: `Bearer ${result.access_token}`
                }
            })
            userUpdateResponse.should.have.property('statusCode', 403)

            // Return the scope granted to this user
            return result.scope
        }

        it('rejects invalid redirect_uri - non-uri', async function () {
            const instanceCreds = await app.project.refreshAuthTokens()
            const clientID = instanceCreds.clientID

            // 1. Initial request - without session cookie
            const requestOptions = generateOAuthRequest({ clientID, callbackURL: 'garbage-url' })
            const response = await app.inject({
                method: 'GET',
                url: requestOptions.authURL
            })
            response.should.have.property('statusCode', 400)
            const reply = response.json()
            reply.should.have.property('error', 'invalid_request')
            reply.description.should.match(/redirect_uri/)
        })
        it('rejects invalid redirect_uri - invalid uri', async function () {
            const instanceCreds = await app.project.refreshAuthTokens()
            const clientID = instanceCreds.clientID

            // 1. Initial request - without session cookie
            const requestOptions = generateOAuthRequest({ clientID, callbackURL: 'https://example.com' })
            const response = await app.inject({
                method: 'GET',
                url: requestOptions.authURL
            })
            response.should.have.property('statusCode', 400)
            const reply = response.json()
            reply.should.have.property('error', 'invalid_request')
            reply.description.should.match(/redirect_uri/)
        })

        it('redirects non-logged in user to login', async function () {
            const instanceCreds = await app.project.refreshAuthTokens()
            const clientID = instanceCreds.clientID

            // 1. Initial request - without session cookie
            const requestOptions = generateOAuthRequest({ clientID })
            const response = await app.inject({
                method: 'GET',
                url: requestOptions.authURL
            })
            response.should.have.property('statusCode', 302)
            response.headers.should.have.property('location')
            // http://localhost:3000/account/request/JLbmkNfLuOzijo8Q3P0vX3M3QUXeXW6MaicHpTYMmJ4/editor

            const m = /\/account\/request\/([^/]+)\/editor$/.exec(response.headers.location)
            should.exist(m, 'location header format incorrect: ' + response.headers.location)
        })

        it('completes oauth flow - team owner - full-access', async function () {
            await app.team.addUser(TestObjects.bob, { through: { role: app.factory.Roles.Roles.Owner } })
            const scope = await runFullLogin(TestObjects.bob)
            scope.should.equal('*')
        })
        it('completes oauth flow - team member - full-access', async function () {
            await app.team.addUser(TestObjects.bob, { through: { role: app.factory.Roles.Roles.Member } })
            const scope = await runFullLogin(TestObjects.bob)
            scope.should.equal('*')
        })
        it('completes oauth flow - team viewer - read-only', async function () {
            await app.team.addUser(TestObjects.bob, { through: { role: app.factory.Roles.Roles.Viewer } })
            const scope = await runFullLogin(TestObjects.bob)
            scope.should.equal('read')
        })
        it('denies access - dashboard role', async function () {
            await app.team.addUser(TestObjects.bob, { through: { role: app.factory.Roles.Roles.Dashboard } })

            const instanceCreds = await app.project.refreshAuthTokens()
            const clientID = instanceCreds.clientID

            // 1. Initial request
            const requestOptions = generateOAuthRequest({ clientID })
            const response = await app.inject({
                method: 'GET',
                url: requestOptions.authURL,
                cookies: { sid: TestObjects.tokens[TestObjects.bob.username] }
            })
            response.should.have.property('statusCode', 302)
            response.headers.should.have.property('location')
            const m = /(\/account\/complete\/[^/]+)$/.exec(response.headers.location)
            should.exist(m, 'location header format incorrect: ' + response.headers.location)

            // 2. Follow the redirect from step 1
            const completeUrl = m[1]
            const response2 = await app.inject({
                method: 'GET',
                url: completeUrl,
                cookies: { sid: TestObjects.tokens[TestObjects.bob.username] }
            })
            response2.should.have.property('statusCode', 400)
            response2.body.should.equal('Access Denied: you do not have access to the editor')
        })

        it('denies access - no role', async function () {
            const instanceCreds = await app.project.refreshAuthTokens()
            const clientID = instanceCreds.clientID

            // 1. Initial request
            const requestOptions = generateOAuthRequest({ clientID })
            const response = await app.inject({
                method: 'GET',
                url: requestOptions.authURL,
                cookies: { sid: TestObjects.tokens[TestObjects.bob.username] }
            })
            response.should.have.property('statusCode', 302)
            response.headers.should.have.property('location')
            const m = /(\/account\/complete\/[^/]+)$/.exec(response.headers.location)
            should.exist(m, 'location header format incorrect: ' + response.headers.location)

            // 2. Follow the redirect from step 1
            const completeUrl = m[1]
            const response2 = await app.inject({
                method: 'GET',
                url: completeUrl,
                cookies: { sid: TestObjects.tokens[TestObjects.bob.username] }
            })
            response2.should.have.property('statusCode', 302)
        })

        it('completes oauth flow - non-member admin - read-only', async function () {
            // Remove admin alice from the team
            await app.db.models.TeamMember.destroy({ where: { UserId: app.adminUser.id } })
            await login('alice', 'aaPassword')
            const scope = await runFullLogin(app.adminUser)
            scope.should.equal('read')
        })

        it('completes oauth flow - owner on protected instance - read-only', async function () {
            await app.team.addUser(TestObjects.bob, { through: { role: app.factory.Roles.Roles.Owner } })
            await app.project.updateProtectedInstanceState({ enabled: true })
            await login('bob', 'bbPassword')
            const scope = await runFullLogin(TestObjects.bob)
            scope.should.equal('read')
        })
    })
})
