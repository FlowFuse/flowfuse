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
    describe('Telemetry Setting', function () {
        const TELEMETRY_KEY = 'telemetry:enabled'
        it('Can disable telemetry when unlicensed', async function () {
            app.settings.set(TELEMETRY_KEY, true)
            app.settings.get(TELEMETRY_KEY).should.be.true()

            await app.inject({
                method: 'PUT',
                url: settingsURL,
                cookies: { sid: TestObjects.tokens.alice },
                payload: {
                    [TELEMETRY_KEY]: false
                }
            })
            app.settings.get(TELEMETRY_KEY).should.be.false()
            const response = await app.inject({
                method: 'GET',
                url: settingsURL,
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(200)
            const settings = response.json()
            settings.should.have.property(TELEMETRY_KEY, false)
        })
        it('Cannot disable telemetry when licensed', async function () {
            /*
                License Details:
                {
                    "iss": "FlowForge Inc.",
                    "sub": "FlowForge Inc.",
                    "nbf": 1662422400,
                    "exp": 7986902399,
                    "note": "Development-mode Only. Not for production",
                    "users": 4,
                    "teams": 5,
                    "projects": 6,
                    "devices": 7,
                    "dev": true
                }
            */
            await app.license.apply('eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJGbG93Rm9yZ2UgSW5jLiIsInN1YiI6IkZsb3dGb3JnZSBJbmMuIiwibmJmIjoxNjYyNDIyNDAwLCJleHAiOjc5ODY5MDIzOTksIm5vdGUiOiJEZXZlbG9wbWVudC1tb2RlIE9ubHkuIE5vdCBmb3IgcHJvZHVjdGlvbiIsInVzZXJzIjo0LCJ0ZWFtcyI6NSwicHJvamVjdHMiOjYsImRldmljZXMiOjcsImRldiI6dHJ1ZSwiaWF0IjoxNjYyNDc2OTg5fQ.XJfAKSKH0ndmrD8z-GX1eWr7OdMnStIdP0ebtC3mKWvnT22TZK0pUx0jDMPFRROFDAJo_eh50T5OUHHfwSp1YQ')
            app.settings.set(TELEMETRY_KEY, true)
            app.settings.get(TELEMETRY_KEY).should.be.true()

            await app.inject({
                method: 'PUT',
                url: settingsURL,
                cookies: { sid: TestObjects.tokens.alice },
                payload: {
                    [TELEMETRY_KEY]: false
                }
            })
            app.settings.get(TELEMETRY_KEY).should.be.true()
            const response = await app.inject({
                method: 'GET',
                url: settingsURL,
                cookies: { sid: TestObjects.tokens.alice }
            })
            response.statusCode.should.equal(200)
            const settings = response.json()
            settings.should.have.property(TELEMETRY_KEY, true)
        })
    })
})
