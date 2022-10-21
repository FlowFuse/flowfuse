const should = require('should') // eslint-disable-line
const setup = require('../setup')

describe('Settings API', function () {
    let app
    const settingsURL = '/api/v1/settings'
    const TestObjects = {}
    beforeEach(async function () {
        app = await setup()
        TestObjects.alice = await app.db.models.User.byUsername('alice')
        TestObjects.tokens = {}
        await login('alice', 'aaPassword')
    })

    afterEach(async function () {
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

    describe('Feature Flags', function () {
        it('returns public feature flags for anonymous user', async function () {
            app.config.features.register('test-public-feature', 123, true)
            app.config.features.register('test-private-feature', 456, false)

            const response = await app.inject({
                method: 'GET',
                url: settingsURL
            })
            const settings = response.json()
            settings.should.have.property('features')
            settings.features.should.have.property('test-public-feature', 123)
            settings.features.should.not.have.property('test-private-feature')
        })
        it('returns all feature flags for logged in user', async function () {
            app.config.features.register('test-public-feature', 123, true)
            app.config.features.register('test-private-feature', 456, false)

            const response = await app.inject({
                method: 'GET',
                url: settingsURL,
                cookies: { sid: TestObjects.tokens.alice }
            })
            const settings = response.json()
            settings.should.have.property('features')
            settings.features.should.have.property('test-public-feature', 123)
            settings.features.should.have.property('test-private-feature', 456)
        })
    })
})
