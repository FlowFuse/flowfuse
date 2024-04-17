const sleep = require('util').promisify(setTimeout)

const should = require('should') // eslint-disable-line

const setup = require('../../setup')

const FF_UTIL = require('flowforge-test-utils')
const { Roles } = FF_UTIL.require('forge/lib/roles')
const { START_DELAY } = FF_UTIL.require('forge/containers/stub/index.js')

describe('NR HTTP Bearer Tokens', function () {
    let app
    const TestObjects = { tokens: {} }

    before(async function () {
        setup.setupStripe()
        app = await setup()
        await login('alice', 'aaPassword')

        // setup FF Auth for team type
        const defaultTeamTypeProperties = app.defaultTeamType.properties
        defaultTeamTypeProperties.features.teamHttpSecurity = true
        app.defaultTeamType.properties = defaultTeamTypeProperties
        await app.defaultTeamType.save()

        TestObjects.BTeam = await app.db.models.Team.create({ name: 'BTeam', TeamTypeId: app.defaultTeamType.id })
        await TestObjects.BTeam.addUser(TestObjects.alice, { through: { role: Roles.Owner } })
        await app.factory.createSubscription(TestObjects.BTeam)

        const userBob = await app.factory.createUser({
            username: 'bob',
            name: 'Bob Fett',
            email: 'bob@example.com',
            password: 'bbPassword'
        })

        await TestObjects.BTeam.addUser(userBob, { through: { role: Roles.Member } })

        TestObjects.application = await app.db.models.Application.create({
            name: 'B-team Application',
            description: 'B-team Application description',
            TeamId: TestObjects.BTeam.id
        })

        // Create a new instance
        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/projects',
            payload: {
                name: 'test-tokens-project-1',
                applicationId: TestObjects.application.hashid,
                projectType: app.projectType.hashid,
                template: app.template.hashid,
                stack: app.stack.hashid
            },
            cookies: { sid: TestObjects.tokens.alice }
        })
        TestObjects.project = await app.db.models.Project.byId(JSON.parse(response.body).id)
        // Ensure the project is started
        await sleep(START_DELAY)
    })

    after(async function () {
        await app.close()
        setup.resetStripe()
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

    it('create HTTP token', async function () {
        const response = await app.inject({
            method: 'POST',
            url: `/api/v1/projects/${TestObjects.project.id}/httpTokens`,
            payload: {
                name: 'foo',
                scope: ''
            },
            cookies: { sid: TestObjects.tokens.alice }
        })
        response.statusCode.should.equal(200)
        const body = await response.json()

        body.should.have.property('token')
        body.should.have.property('id')
        ;(typeof body.id).should.equal('string')
        const token = body.token

        const authResponse = await app.inject({
            method: 'GET',
            url: `/account/check/http/${TestObjects.project.id}`,
            headers: {
                authorization: `Bearer ${token}`
            }
        })
        authResponse.statusCode.should.equal(200)

        let authFailResponse = await app.inject({
            method: 'GET',
            url: `/account/check/http/${TestObjects.project.id}`,
            headers: {
                authorization: 'Bearer foo'
            }
        })
        authFailResponse.statusCode.should.equal(401)

        const dayAfterTomorrow = Date.now() + (48 * 60 * 60 * 10000)
        const modifyResponse = await app.inject({
            method: 'PUT',
            url: `/api/v1/projects/${TestObjects.project.id}/httpTokens/${body.id}`,
            payload: {
                scope: '',
                expiresAt: dayAfterTomorrow
            },
            cookies: { sid: TestObjects.tokens.alice }
        })
        modifyResponse.statusCode.should.equal(200)
        const modifiedToken = modifyResponse.json()
        modifiedToken.should.not.have.property('token')
        modifiedToken.should.have.property('expiresAt', new Date(dayAfterTomorrow).toISOString())

        const deleteResponse = await app.inject({
            method: 'DELETE',
            url: `/api/v1/projects/${TestObjects.project.id}/httpTokens/${body.id}`,
            cookies: { sid: TestObjects.tokens.alice }
        })
        deleteResponse.statusCode.should.equal(201)

        authFailResponse = await app.inject({
            method: 'GET',
            url: `/account/check/http/${TestObjects.project.id}`,
            headers: {
                authorization: `Bearer ${token}`
            }
        })
        authFailResponse.statusCode.should.equal(401)
    })

    it('non-team owner cannot modify/delete token', async function () {
        await login('bob', 'bbPassword')

        const response = await app.inject({
            method: 'POST',
            url: `/api/v1/projects/${TestObjects.project.id}/httpTokens`,
            payload: {
                name: 'foo',
                scope: ''
            },
            cookies: { sid: TestObjects.tokens.alice }
        })
        response.statusCode.should.equal(200)
        const token = await response.json()

        // Verify bob (team-member) cannot modify
        const modifyResponse1 = await app.inject({
            method: 'PUT',
            url: `/api/v1/projects/${TestObjects.project.id}/httpTokens/${token.id}`,
            payload: {
                name: 'foo'
            },
            cookies: { sid: TestObjects.tokens.bob }
        })
        modifyResponse1.statusCode.should.equal(403)

        // Verify bob (team-member) cannot modify
        const deleteResponse = await app.inject({
            method: 'DELETE',
            url: `/api/v1/projects/${TestObjects.project.id}/httpTokens/${token.id}`,
            cookies: { sid: TestObjects.tokens.bob }
        })
        deleteResponse.statusCode.should.equal(403)
    })

    it('cannot modify/delete token across-teams', async function () {
        // Create a new instance
        const instanceResponse = await app.inject({
            method: 'POST',
            url: '/api/v1/projects',
            payload: {
                name: 'test-tokens-project-2',
                applicationId: TestObjects.application.hashid,
                projectType: app.projectType.hashid,
                template: app.template.hashid,
                stack: app.stack.hashid
            },
            cookies: { sid: TestObjects.tokens.alice }
        })
        const instance2 = instanceResponse.json()

        // Create token for instance 1
        const response = await app.inject({
            method: 'POST',
            url: `/api/v1/projects/${TestObjects.project.id}/httpTokens`,
            payload: {
                name: 'foo',
                scope: ''
            },
            cookies: { sid: TestObjects.tokens.alice }
        })
        response.statusCode.should.equal(200)
        const token = await response.json()

        // Verify cannot modify when referenced under instance2
        const modifyResponse1 = await app.inject({
            method: 'PUT',
            url: `/api/v1/projects/${instance2.id}/httpTokens/${token.id}`,
            payload: {
                name: 'foo'
            },
            cookies: { sid: TestObjects.tokens.alice }
        })
        modifyResponse1.statusCode.should.equal(404)

        // Verify cannot delete when referenced under instance2
        const deleteResponse = await app.inject({
            method: 'DELETE',
            url: `/api/v1/projects/${instance2.id}/httpTokens/${token.id}`,
            cookies: { sid: TestObjects.tokens.alice }
        })
        deleteResponse.statusCode.should.equal(404)
    })
})
