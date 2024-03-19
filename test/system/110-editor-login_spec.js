const crypto = require('node:crypto')

const should = require('should') // eslint-disable-line no-unused-vars

const { base64URLEncode } = require('../../forge/db/utils')
const TestModelFactory = require('../lib/TestModelFactory')

const FF_UTIL = require('flowforge-test-utils')

const { Roles } = FF_UTIL.require('forge/lib/roles')

describe('Node-RED Editor Login', function () {
    // forge - this will be the running FF application we are testing
    let app

    const TestObjects = {}

    before(async function () {
        // Create the FF application with a suitable test configuration
        app = await FF_UTIL.setupApp({
            telemetry: { enabled: false },
            logging: {
                level: 'warn'
            },
            driver: {
                type: 'stub'
            },
            db: {
                type: 'sqlite',
                storage: ':memory:'
            }
        })

        const factory = new TestModelFactory(app)

        // Setup the database with basic artefacts
        await app.db.models.PlatformSettings.upsert({ key: 'setup:initialised', value: true })
        TestObjects.userAlice = await factory.createUser({ admin: true, username: 'alice', name: 'Alice Skywalker', email: 'alice@example.com', password: 'aaPassword' })
        TestObjects.ATeam = await factory.createTeam({ name: 'ATeam' })
        await TestObjects.ATeam.addUser(TestObjects.userAlice, { through: { role: Roles.Owner } })

        TestObjects.userBob = await factory.createUser({ username: 'bob', name: 'Bob', email: 'bob@example.com', password: 'bbPassword' })
        await TestObjects.ATeam.addUser(TestObjects.userBob, { through: { role: Roles.Viewer } })

        TestObjects.userChris = await factory.createUser({ username: 'chris', name: 'Chris', email: 'chris@example.com', password: 'ccPassword' })
        await TestObjects.ATeam.addUser(TestObjects.userChris, { through: { role: Roles.Dashboard } })

        TestObjects.Application1 = await factory.createApplication({ name: 'application1' }, TestObjects.ATeam)
        TestObjects.Application2 = await factory.createApplication({ name: 'application2' }, TestObjects.ATeam)

        TestObjects.ProjectType1 = await factory.createProjectType({ name: 'projectType1' })

        TestObjects.Stack1 = await factory.createStack({ name: 'stack1', properties: { foo: 'bar' } }, TestObjects.ProjectType1)
        TestObjects.Stack2 = await factory.createStack({ name: 'stack2', properties: { foo: 'bar' } }, TestObjects.ProjectType1)

        TestObjects.Template1 = await factory.createProjectTemplate({ name: 'template1' })

        TestObjects.Instance1 = await factory.createInstance(
            { name: 'instance1' },
            TestObjects.Application1,
            TestObjects.Stack1,
            TestObjects.template,
            TestObjects.ProjectType1,
            { start: false }
        )
        TestObjects.tokens = {}
        TestObjects.tokens.Instance1 = (await TestObjects.Instance1.refreshAuthTokens())

        await login('alice', 'aaPassword')
        await login('bob', 'bbPassword')
        await login('chris', 'ccPassword')
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

    after(function () {
        return app.close()
    })

    async function doEditorLogin (userToken, scope, dashboardOnly = false) {
        const state = base64URLEncode(crypto.randomBytes(16))
        const verifier = base64URLEncode(crypto.randomBytes(32))
        const redirectCallback = 'http://example.com/auth/strategy/callback'
        const params = {}
        params.client_id = TestObjects.tokens.Instance1.clientID
        params.scope = scope
        params.response_type = 'code'
        params.state = state
        params.code_challenge = base64URLEncode(crypto.createHash('sha256').update(verifier).digest())
        params.code_challenge_method = 'S256'
        params.redirect_uri = redirectCallback
        const response = await app.inject({
            method: 'GET',
            url: `/account/authorize?${new URLSearchParams(params)}`,
            headers: {
                authorization: `Bearer ${userToken}`
            }
        })
        response.statusCode.should.equal(302)
        response.headers.should.have.property('location')

        // http://localhost:3000/account/request/z7TucmJ-avnR1eyJLUII5wccsNn3EiU3CpBbpdxx9wg/editor

        const parts = response.headers.location.split('/')
        const token = parts[parts.length - 2]

        const response2 = await app.inject({
            method: 'GET',
            url: `/account/complete/${token}`,
            cookies: {
                sid: userToken
            }
        })

        if (dashboardOnly) {
            response2.statusCode.should.equal(400)
            response2.body.should.equal('Access Denied: you do not have access to the editor')
            return
        }
        response2.statusCode.should.equal(302)
        response2.headers.should.have.property('location')
        // http://example.com/flowforge-nr-tools/auth/callback?code=eANs21GUv7OqN99S2QxJ4tS1BD5RYEzOEfb-lhLUciw&state=YMbFnV1E_2aPwz_Ktca1DQ
        const callbackURL = new URL(response2.headers.location)
        callbackURL.pathname.should.equal('/auth/strategy/callback')
        callbackURL.host.should.equal('example.com')
        should.exist(callbackURL.searchParams.get('code'))
        should.exist(callbackURL.searchParams.get('state'))
        callbackURL.searchParams.get('state').should.equal(state)

        const params2 = {}
        params2.grant_type = 'authorization_code'
        params2.code = callbackURL.searchParams.get('code')
        params2.redirect_uri = redirectCallback
        params2.client_id = TestObjects.tokens.Instance1.clientID
        params2.code_verifier = verifier

        const response3 = await app.inject({
            url: '/account/token',
            method: 'POST',
            payload: params2,
            headers: {
                authorization: `Bearer ${userToken}`
            }
        })
        response3.statusCode.should.equal(200)
        const body = JSON.parse(response3.body)
        body.should.have.property('state', state)
        return body
    }

    it('editor login via oauth flow - full access', async function () {
        const tokens = await doEditorLogin(TestObjects.tokens.alice, 'editor-0.18', false)
        tokens.should.have.property('scope', '*')
        const response = await app.inject({
            url: '/api/v1/user',
            method: 'GET',
            headers: {
                authorization: `Bearer ${tokens.access_token}`
            }
        })
        response.statusCode.should.equal(200)
        const result = JSON.parse(response.body)
        result.should.have.property('username', 'alice')
    })

    it('editor login via oauth flow - read-only access', async function () {
        const tokens = await doEditorLogin(TestObjects.tokens.bob, 'editor-0.18', false)
        tokens.should.have.property('scope', 'read')
        const response = await app.inject({
            url: '/api/v1/user',
            method: 'GET',
            headers: {
                authorization: `Bearer ${tokens.access_token}`
            }
        })
        response.statusCode.should.equal(200)
        const result = JSON.parse(response.body)
        result.should.have.property('username', 'bob')
    })

    it('editor login via oauth flow - dashboard-only access', async function () {
        await doEditorLogin(TestObjects.tokens.chris, 'editor-0.18', true)
    })

    it('httpAuth login via oauth flow - full access', async function () {
        const tokens = await doEditorLogin(TestObjects.tokens.alice, 'httpAuth-0.18', false)
        const response = await app.inject({
            url: '/api/v1/user',
            method: 'GET',
            headers: {
                authorization: `Bearer ${tokens.access_token}`
            }
        })
        response.statusCode.should.equal(200)
        const result = JSON.parse(response.body)
        result.should.have.property('username', 'alice')
    })

    it('httpAuth login via oauth flow - read-only access', async function () {
        const tokens = await doEditorLogin(TestObjects.tokens.bob, 'httpAuth-0.18', false)
        const response = await app.inject({
            url: '/api/v1/user',
            method: 'GET',
            headers: {
                authorization: `Bearer ${tokens.access_token}`
            }
        })
        response.statusCode.should.equal(200)
        const result = JSON.parse(response.body)
        result.should.have.property('username', 'bob')
    })

    it('httpAuth login via oauth flow - dashboard-only access', async function () {
        const tokens = await doEditorLogin(TestObjects.tokens.chris, 'httpAuth-0.18', false)
        const response = await app.inject({
            url: '/api/v1/user',
            method: 'GET',
            headers: {
                authorization: `Bearer ${tokens.access_token}`
            }
        })
        response.statusCode.should.equal(200)
        const result = JSON.parse(response.body)
        result.should.have.property('username', 'chris')
    })
})
