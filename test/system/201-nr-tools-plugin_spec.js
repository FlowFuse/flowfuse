const crypto = require('node:crypto')

const should = require('should') // eslint-disable-line no-unused-vars

const { base64URLEncode } = require('../../forge/db/utils')
const { addFlowsToProject } = require('../lib/Snapshots')
const TestModelFactory = require('../lib/TestModelFactory')

const FF_UTIL = require('flowforge-test-utils')
const { LocalTransport } = require('flowforge-test-utils/forge/postoffice/localTransport.js')

const { Roles } = FF_UTIL.require('forge/lib/roles')

describe('Node-RED Tools Plugin', function () {
    // forge - this will be the running FF application we are testing
    let app
    // inbox - a local transport we can use to capture email without an SMTP server
    const inbox = new LocalTransport()

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
            },
            email: {
                enabled: true,
                transport: inbox
            }
        })

        const factory = new TestModelFactory(app)

        // Setup the database with basic artefacts
        await app.db.models.PlatformSettings.upsert({ key: 'setup:initialised', value: true })
        TestObjects.userAlice = await factory.createUser({ admin: true, username: 'alice', name: 'Alice Skywalker', email: 'alice@example.com', password: 'aaPassword' })
        TestObjects.ATeam = await factory.createTeam({ name: 'ATeam' })
        await TestObjects.ATeam.addUser(TestObjects.userAlice, { through: { role: Roles.Owner } })

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
        TestObjects.tokens.Instance1 = (await TestObjects.Instance1.refreshAuthTokens()).token

        TestObjects.Instance2 = await factory.createInstance(
            { name: 'instance2' },
            TestObjects.Application2,
            TestObjects.Stack1,
            TestObjects.template,
            TestObjects.ProjectType1,
            { start: false }
        )
        const response = await app.inject({
            method: 'POST',
            url: '/account/login',
            payload: { username: 'alice', password: 'aaPassword', remember: false }
        })
        response.cookies.should.have.length(1)
        response.cookies[0].should.have.property('name', 'sid')
        TestObjects.accessToken = response.cookies[0].value

        await addFlowsToProject(app,
            TestObjects.Instance1.id,
            TestObjects.tokens.Instance1,
            TestObjects.tokens.alice,
            [{ id: 'node1' }],
            { testCreds: 'abc' },
            'key1',
            {
                httpAdminRoot: '/test-red',
                dashboardUI: '/test-dash',
                env: [
                    { name: 'one', value: 'a' },
                    { name: 'two', value: 'b' }
                ]
            }
        )
        await createSnapshot(TestObjects.Instance1.id, 'test-project-snapshot-01', TestObjects.accessToken)
    })

    after(function () {
        return app.close()
    })

    async function createSnapshot (projectId, name, token) {
        return await app.inject({
            method: 'POST',
            url: `/api/v1/projects/${projectId}/snapshots`,
            payload: {
                name
            },
            cookies: { sid: token }
        })
    }

    it('can login via oauth flow', async function () {
        const state = base64URLEncode(crypto.randomBytes(16))
        const verifier = base64URLEncode(crypto.randomBytes(32))
        const scope = 'ff-plugin'
        const redirectCallback = 'http://example.com/flowfuse-nr-tools/auth/callback'
        const params = {}
        params.client_id = 'ff-plugin'
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
                authorization: `Bearer ${TestObjects.accessToken}`
            }
        })
        response.statusCode.should.equal(302)
        response.headers.should.have.property('location')
        // http://localhost:3000/account/request/z7TucmJ-avnR1eyJLUII5wccsNn3EiU3CpBbpdxx9wg

        const parts = response.headers.location.split('/')
        const token = parts[parts.length - 1]

        const response2 = await app.inject({
            method: 'GET',
            url: `/account/complete/${token}`,
            cookies: {
                sid: TestObjects.accessToken
            }
        })
        response2.statusCode.should.equal(302)
        response2.headers.should.have.property('location')
        // http://example.com/flowfuse-nr-tools/auth/callback?code=eANs21GUv7OqN99S2QxJ4tS1BD5RYEzOEfb-lhLUciw&state=YMbFnV1E_2aPwz_Ktca1DQ
        const callbackURL = new URL(response2.headers.location)
        callbackURL.pathname.should.equal('/flowfuse-nr-tools/auth/callback')
        callbackURL.host.should.equal('example.com')
        should.exist(callbackURL.searchParams.get('code'))
        should.exist(callbackURL.searchParams.get('state'))
        callbackURL.searchParams.get('state').should.equal(state)

        const params2 = {}
        params2.grant_type = 'authorization_code'
        params2.code = callbackURL.searchParams.get('code')
        params2.redirect_uri = redirectCallback
        params2.client_id = 'ff-plugin'
        params2.code_verifier = verifier

        const response3 = await app.inject({
            url: '/account/token',
            method: 'POST',
            payload: params2,
            headers: {
                authorization: `Bearer ${TestObjects.accessToken}`
            }
        })
        response3.statusCode.should.equal(200)
        const body = JSON.parse(response3.body)
        body.should.have.property('state', state)
        TestObjects.ToolsTokens = body
    })

    it('can access user information', async function () {
        const response = await app.inject({
            url: '/api/v1/user',
            method: 'GET',
            headers: {
                authorization: `Bearer ${TestObjects.ToolsTokens.access_token}`
            }
        })
        response.statusCode.should.equal(200)
        const result = JSON.parse(response.body)
        result.should.have.property('username', 'alice')
    })

    it('can access user team list', async function () {
        const response = await app.inject({
            url: '/api/v1/user/teams',
            method: 'GET',
            headers: {
                authorization: `Bearer ${TestObjects.ToolsTokens.access_token}`
            }
        })
        response.statusCode.should.equal(200)
        const result = JSON.parse(response.body)
        result.should.have.property('count', 1)
        result.teams.should.have.length(1)
        result.teams[0].should.have.property('id', TestObjects.ATeam.hashid)
    })

    it('can access user team information', async function () {
        const response = await app.inject({
            url: `/api/v1/teams/${TestObjects.ATeam.hashid}`,
            method: 'GET',
            headers: {
                authorization: `Bearer ${TestObjects.ToolsTokens.access_token}`
            }
        })
        response.statusCode.should.equal(200)
        const result = JSON.parse(response.body)
        result.should.have.property('id', TestObjects.ATeam.hashid)
    })

    it('can access user team instance list', async function () {
        const response = await app.inject({
            url: `/api/v1/teams/${TestObjects.ATeam.hashid}/projects`,
            method: 'GET',
            headers: {
                authorization: `Bearer ${TestObjects.ToolsTokens.access_token}`
            }
        })
        response.statusCode.should.equal(200)
        const result = JSON.parse(response.body)
        result.should.have.property('count', 2)
        result.projects.should.have.length(2)
        const projs = result.projects
        projs.sort((A, B) => A.name.localeCompare(B.name))
        projs[0].should.have.property('id', TestObjects.Instance1.id)
        projs[1].should.have.property('id', TestObjects.Instance2.id)
    })

    it('can access instance details', async function () {
        const response = await app.inject({
            url: `/api/v1/projects/${TestObjects.Instance1.id}`,
            method: 'GET',
            headers: {
                authorization: `Bearer ${TestObjects.ToolsTokens.access_token}`
            }
        })
        response.statusCode.should.equal(200)
        const result = JSON.parse(response.body)
        result.should.have.property('id', TestObjects.Instance1.id)
    })

    it('can access instance snapshot list', async function () {
        const response = await app.inject({
            url: `/api/v1/projects/${TestObjects.Instance1.id}/snapshots`,
            method: 'GET',
            headers: {
                authorization: `Bearer ${TestObjects.ToolsTokens.access_token}`
            }
        })
        response.statusCode.should.equal(200)
        const result = JSON.parse(response.body)
        result.should.have.property('count', 1)
        result.snapshots.should.have.length(1)
        result.snapshots[0].should.have.property('name', 'test-project-snapshot-01')
    })

    it('can create a new snapshot', async function () {
        const snapshot = {
            name: 'new-snapshot',
            description: 'new-snapshot-description',
            flows: [{ id: 'n1' }],
            credentials: { n1: { foo: 'bar' } }
        }
        const response = await app.inject({
            url: `/api/v1/projects/${TestObjects.Instance1.id}/snapshots`,
            method: 'POST',
            payload: snapshot,
            headers: {
                authorization: `Bearer ${TestObjects.ToolsTokens.access_token}`
            }
        })
        response.statusCode.should.equal(200)

        const ss = await app.db.models.ProjectSnapshot.forProject(TestObjects.Instance1.id)
        ss.snapshots.should.have.length(2)
        ss.snapshots[0].name.should.equal('new-snapshot')
        ss.snapshots[0].description.should.equal('new-snapshot-description')

        await ss.snapshots[0].reload()

        ss.snapshots[0].flows.should.have.property('flows')
        ss.snapshots[0].flows.should.have.property('credentials')
        ss.snapshots[0].flows.flows.should.have.length(1)
        ss.snapshots[0].flows.flows[0].should.have.property('id', 'n1')
        ss.snapshots[0].flows.credentials.should.have.property('$')
    })

    it('cannot delete an instance', async function () {
        const response = await app.inject({
            url: `/api/v1/projects/${TestObjects.Instance1.id}`,
            method: 'DELETE',
            headers: {
                authorization: `Bearer ${TestObjects.ToolsTokens.access_token}`
            }
        })
        response.statusCode.should.equal(403)
    })
})
