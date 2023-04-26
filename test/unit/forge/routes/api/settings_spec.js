const mockDate = require('mockdate')
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

        TestObjects.bob = await app.factory.createUser({
            admin: false,
            username: 'bob',
            name: 'Bob',
            email: 'bob@example.com',
            password: 'bbPassword'
        })
        await login('bob', 'bbPassword')
    })

    afterEach(async function () {
        await app.close()
        mockDate.reset()
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
        it('Non-admin user cannot modify settings', async function () {
            const result = await app.inject({
                method: 'PUT',
                url: settingsURL,
                cookies: { sid: TestObjects.tokens.bob },
                payload: {
                    [TELEMETRY_KEY]: false
                }
            })
            result.statusCode.should.equal(403)
        })
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
    describe('License Status', function () {
        it('Does not return license status for anonymous user', async function () {
            const response = await app.inject({
                method: 'GET',
                url: settingsURL
            })
            const settings = response.json()
            settings.should.not.have.property('license')
        })
        describe('EE', function () {
            /**
             * Example license object:
             * ```js
                settings.license = {
                    type: 'EE'|'CE'|'DEV',
                    expiresAt: '2223-02-05T23:59:59.000Z',
                    expiring: boolean,
                    expired: boolean,
                    daysRemaining: number,
                    PRE_EXPIRE_WARNING_DAYS: number
                }
            * ```
            */
            const license = 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJGbG93Rm9yZ2UgSW5jLiIsInN1YiI6IkZsb3dGb3JnZSBJbmMuIERldmVsb3BtZW50IiwibmJmIjoxNjYyNTA4ODAwLCJleHAiOjc5ODY5ODg3OTksIm5vdGUiOiJEZXZlbG9wbWVudC1tb2RlIE9ubHkuIE5vdCBmb3IgcHJvZHVjdGlvbiIsInVzZXJzIjo1LCJ0ZWFtcyI6NTAsInByb2plY3RzIjo1MCwiZGV2aWNlcyI6NTAsImRldiI6dHJ1ZSwiaWF0IjoxNjYyNTQ4NjAyfQ.vvSw6pm-NP5e0NUL7yMOG-w0AgB8H3NRGGN7b5Dw_iW5DiIBbVQ4HVLEi3dyy9fk7WgKnloiCCkIFJvN79fK_g'

            it('Returns correct license status for logged in user', async function () {
                await app.license.apply(license)
                mockDate.set('2223-01-01')
                await login('alice', 'aaPassword')
                const response = await app.inject({
                    method: 'GET',
                    url: settingsURL,
                    cookies: { sid: TestObjects.tokens.alice }
                })
                const settings = response.json()
                settings.should.have.property('license')

                settings.license.should.only.have.keys('type', 'expiresAt', 'expiring', 'expired', 'daysRemaining', 'PRE_EXPIRE_WARNING_DAYS')
                settings.license.should.have.property('type', 'DEV')
                settings.license.should.have.property('expiresAt', '2223-02-05T23:59:59.000Z')
                settings.license.should.have.property('expiring', false)
                settings.license.should.have.property('expired', false)
                settings.license.should.have.property('daysRemaining', 35)
            })
            it('Returns correct license status in warning period', async function () {
                await app.license.apply(license)
                mockDate.set('2223-01-06')
                await login('alice', 'aaPassword')
                const response = await app.inject({
                    method: 'GET',
                    url: settingsURL,
                    cookies: { sid: TestObjects.tokens.alice }
                })
                const settings = response.json()
                settings.should.have.property('license')

                settings.license.should.only.have.keys('type', 'expiresAt', 'expiring', 'expired', 'daysRemaining', 'PRE_EXPIRE_WARNING_DAYS')
                settings.license.should.have.property('type', 'DEV')
                settings.license.should.have.property('expiresAt', '2223-02-05T23:59:59.000Z')
                settings.license.should.have.property('expiring', true)
                settings.license.should.have.property('expired', false)
                settings.license.should.have.property('daysRemaining', 30)
            })
            it('Returns correct license status when expired', async function () {
                await app.license.apply(license)
                mockDate.set('2223-03-08')
                await login('alice', 'aaPassword')
                const response = await app.inject({
                    method: 'GET',
                    url: settingsURL,
                    cookies: { sid: TestObjects.tokens.alice }
                })
                const settings = response.json()
                settings.should.have.property('license')

                settings.license.should.only.have.keys('type', 'expiresAt', 'expiring', 'expired', 'daysRemaining', 'PRE_EXPIRE_WARNING_DAYS')
                settings.license.should.have.property('type', 'DEV')
                settings.license.should.have.property('expiresAt', '2223-02-05T23:59:59.000Z')
                settings.license.should.have.property('expiring', false)
                settings.license.should.have.property('expired', true)
                settings.license.should.have.property('daysRemaining', 0)
            })
        })
        describe('CE', function () {
            it('Returns correct license status for logged in user', async function () {
                const midnightTonight = new Date()
                midnightTonight.setHours(0, 0, 0, 0)
                const midnight1YearLater = new Date()
                midnight1YearLater.setHours(0, 0, 0, 0)
                midnight1YearLater.setDate(midnightTonight.getDate() + 365)
                mockDate.set(midnightTonight)
                await login('alice', 'aaPassword')

                const response = await app.inject({
                    method: 'GET',
                    url: settingsURL,
                    cookies: { sid: TestObjects.tokens.alice }
                })
                const settings = response.json()
                settings.should.have.property('license')

                settings.license.should.only.have.keys('type', 'expiresAt', 'expiring', 'expired', 'daysRemaining', 'PRE_EXPIRE_WARNING_DAYS')
                settings.license.should.have.property('type', 'CE')
                settings.license.should.have.property('expiresAt', midnight1YearLater.toISOString())
                settings.license.should.have.property('expired', false)
                settings.license.should.have.property('daysRemaining', 365)
            })
            it('Returns unexpired license status in 2100', async function () {
                mockDate.set('2100-02-06')
                await login('alice', 'aaPassword')
                const response = await app.inject({
                    method: 'GET',
                    url: settingsURL,
                    cookies: { sid: TestObjects.tokens.alice }
                })
                const settings = response.json()
                settings.should.have.property('license')

                settings.license.should.only.have.keys('type', 'expiresAt', 'expiring', 'expired', 'daysRemaining', 'PRE_EXPIRE_WARNING_DAYS')
                settings.license.should.have.property('type', 'CE')
                settings.license.should.have.property('expiresAt', '2101-02-06T00:00:00.000Z')
                settings.license.should.have.property('expired', false)
                settings.license.should.have.property('daysRemaining', 365)
            })
            it('Returns unexpired license status in 2500', async function () {
                mockDate.set('2500-02-06')
                await login('alice', 'aaPassword')
                const response = await app.inject({
                    method: 'GET',
                    url: settingsURL,
                    cookies: { sid: TestObjects.tokens.alice }
                })
                const settings = response.json()
                settings.should.have.property('license')

                settings.license.should.only.have.keys('type', 'expiresAt', 'expiring', 'expired', 'daysRemaining', 'PRE_EXPIRE_WARNING_DAYS')
                settings.license.should.have.property('type', 'CE')
                settings.license.should.have.property('expiresAt', '2501-02-06T00:00:00.000Z')
                settings.license.should.have.property('expired', false)
                settings.license.should.have.property('daysRemaining', 365)
            })
        })
    })
})
