const should = require('should') // eslint-disable-line
const setup = require('../setup')

describe('Project API', function () {
    let app
    const TestObjects = {}
    beforeEach(async function () {
        app = await setup()

        TestObjects.alice = await app.db.models.User.byUsername('alice')

        TestObjects.tokens = {}
        await login('alice', 'aaPassword')
        // TestObjects.tokens.alice = (await app.db.controllers.AccessToken.createTokenForPasswordReset(TestObjects.alice)).token
        TestObjects.tokens.project = (await app.project.refreshAuthTokens()).token
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

    it('Get Project Settings', async function () {
        this.timeout(10000)
        const settingsURL = `/api/v1/projects/${app.project.id}/settings`
        const response = await app.inject({
            method: 'GET',
            url: settingsURL,
            headers: {
                authorization: `Bearer ${TestObjects.tokens.project}`
            }
        })
        const newSettings = response.json()
        should(newSettings).have.property('storageURL')
        should(newSettings).have.property('forgeURL')
    })

    it('Get Project Settings with Alice\'s session', async function () {
        this.timeout(10000)
        const settingsURL = `/api/v1/projects/${app.project.id}/settings`
        const response = await app.inject({
            method: 'GET',
            url: settingsURL,
            cookies: { sid: TestObjects.tokens.alice }
        })
        should(response).have.property('statusCode')
        should(response.statusCode).eqls(401)
    })
})
