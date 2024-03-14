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
})
