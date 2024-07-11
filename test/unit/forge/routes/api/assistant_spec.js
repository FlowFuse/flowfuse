const { default: axios } = require('axios')
const should = require('should') // eslint-disable-line
const sinon = require('sinon')

const setup = require('../setup')

describe('Assistant API', async function () {
    let app
    const TestObjects = {
        /** admin - owns ATeam */
        alice: {},
        ATeam: {},
        /** ATeam Application */
        Application1: {},
        /** ATeam Instance */
        instance: {},
        device: {},
        tokens: {}
    }
    /** @type {import('../../../../lib/TestModelFactory')} */
    let factory = null

    async function setupApp (license) {
        const setupConfig = {
            features: { devices: true },
            assistant: {
                enabled: true,
                service: {
                    url: 'http://localhost:9876',
                    token: 'blah'
                }
            }
        }
        if (license) {
            setupConfig.license = license
        }
        app = await setup(setupConfig)
        factory = app.factory

        await login('alice', 'aaPassword')

        // ATeam create in setup()
        TestObjects.ATeam = await app.db.models.Team.byName('ATeam')
        TestObjects.instance = app.project
        TestObjects.Application1 = app.application
        TestObjects.tokens.instance = (await TestObjects.instance.refreshAuthTokens()).token
        TestObjects.device = await factory.createDevice({ name: 'device1' }, TestObjects.ATeam, null, TestObjects.Application1)
        app.comms = null // skip all the broker stuff
        TestObjects.tokens.device = (await TestObjects.device.refreshAuthTokens()).token
    }

    before(async function () {
        return setupApp()
    })
    after(async function () {
        await app.close()
    })
    afterEach(async function () {
        sinon.restore()
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

    describe('service disabled', async function () {
        it('should return 501 if assistant service is disabled', async function () {
            sinon.stub(app.config.assistant, 'enabled').get(() => false)
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/assistant/function',
                headers: { authorization: 'Bearer ' + TestObjects.tokens.instance },
                payload: { prompt: 'multiply by 5', transactionId: '1234' }
            })
            response.statusCode.should.equal(501)
        })
        it('should return 501 if assistant service url is not set', async function () {
            sinon.stub(app.config.assistant.service, 'url').get(() => null)
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/assistant/function',
                headers: { authorization: 'Bearer ' + TestObjects.tokens.instance },
                payload: { prompt: 'multiply by 5', transactionId: '1234' }
            })
            response.statusCode.should.equal(501)
        })
    })

    describe('method constraints', async function () {
        it('should return 400 if method contains capital letters', async function () {
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/assistant/InvalidMethod',
                headers: { authorization: 'Bearer ' + TestObjects.tokens.instance },
                payload: { prompt: 'multiply by 5', transactionId: '1234' }
            })
            response.statusCode.should.equal(400)
        })
        it('should return 400 if method contains invalid characters', async function () {
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/assistant/inv@lid',
                headers: { authorization: 'Bearer ' + TestObjects.tokens.instance },
                payload: { prompt: 'multiply by 5', transactionId: '1234' }
            })
            response.statusCode.should.equal(400)
        })
        it('should return 400 if method contains escaped characters', async function () {
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/assistant/method%2Fwith%2Fslashes',
                headers: { authorization: 'Bearer ' + TestObjects.tokens.instance },
                payload: { prompt: 'multiply by 5', transactionId: '1234' }
            })
            response.statusCode.should.equal(400)
        })
    })

    describe('service tests', async function () {
        function serviceTests (serviceName) {
            it('anonymous cannot access', async function () {
                const response = await app.inject({
                    method: 'GET',
                    url: `/api/v1/assistant/${serviceName}`
                })
                response.statusCode.should.equal(401)
            })
            it('random token cannot access', async function () {
                const response = await app.inject({
                    method: 'GET',
                    url: `/api/v1/assistant/${serviceName}`,
                    headers: { authorization: 'Bearer blah-blah' }
                })
                response.statusCode.should.equal(401)
            })
            it('user token can not access', async function () {
                sinon.stub(axios, 'post').resolves({ data: { status: 'ok' } })
                const response = await app.inject({
                    method: 'POST',
                    url: `/api/v1/assistant/${serviceName}`,
                    cookies: { sid: TestObjects.tokens.alice },
                    payload: { prompt: 'multiply by 5', transactionId: '1234' }
                })
                response.statusCode.should.equal(401)
                axios.post.calledOnce.should.be.false()
            })
            it('device token can access', async function () {
                const deviceCreateResponse = await app.inject({
                    method: 'POST',
                    url: '/api/v1/devices',
                    body: {
                        name: 'Ad1',
                        type: 'Ad1_type',
                        team: TestObjects.ATeam.hashid
                    },
                    cookies: { sid: TestObjects.tokens.alice }
                })
                const device = deviceCreateResponse.json()
                sinon.stub(axios, 'post').resolves({ data: { status: 'ok' } })
                const response = await app.inject({
                    method: 'POST',
                    url: `/api/v1/assistant/${serviceName}`,
                    headers: { authorization: 'Bearer ' + device.credentials.token },
                    payload: { prompt: 'multiply by 5', transactionId: '1234' }
                })
                axios.post.calledOnce.should.be.true()
                response.statusCode.should.equal(200)
            })
            it('instance token can access', async function () {
                sinon.stub(axios, 'post').resolves({ data: { status: 'ok' } })
                const response = await app.inject({
                    method: 'POST',
                    url: `/api/v1/assistant/${serviceName}`,
                    headers: { authorization: 'Bearer ' + TestObjects.tokens.instance },
                    payload: { prompt: 'multiply by 5', transactionId: '1234' }
                })
                axios.post.calledOnce.should.be.true()
                response.statusCode.should.equal(200)
            })
            it('fails when prompt is not supplied', async function () {
                const response = await app.inject({
                    method: 'POST',
                    url: `/api/v1/assistant/${serviceName}`,
                    headers: { authorization: 'Bearer ' + TestObjects.tokens.instance },
                    payload: { transactionId: '1234' }
                })
                response.statusCode.should.equal(400)
            })
            it('fails when transactionId is not supplied', async function () {
                const response = await app.inject({
                    method: 'POST',
                    url: `/api/v1/assistant/${serviceName}`,
                    headers: { authorization: 'Bearer ' + TestObjects.tokens.instance },
                    payload: { prompt: 'multiply by 5' }
                })
                response.statusCode.should.equal(400)
            })
            it('contains owner info in headers for an instance', async function () {
                sinon.stub(axios, 'post').resolves({ data: { status: 'ok' } })
                await app.inject({
                    method: 'POST',
                    url: `/api/v1/assistant/${serviceName}`,
                    headers: { authorization: 'Bearer ' + TestObjects.tokens.instance },
                    payload: { prompt: 'multiply by 5', transactionId: '1234' }
                })
                axios.post.calledOnce.should.be.true()
                axios.post.args[0][2].headers.should.have.properties({
                    'ff-owner-type': 'project',
                    'ff-owner-id': TestObjects.instance.id
                })
            })
            it('contains owner info in headers for a device', async function () {
                sinon.stub(axios, 'post').resolves({ data: { status: 'ok' } })
                await app.inject({
                    method: 'POST',
                    url: `/api/v1/assistant/${serviceName}`,
                    headers: { authorization: 'Bearer ' + TestObjects.tokens.device },
                    payload: { prompt: 'multiply by 5', transactionId: '1234' }
                })
                axios.post.calledOnce.should.be.true()
                axios.post.args[0][2].headers.should.have.properties({
                    'ff-owner-type': 'device',
                    'ff-owner-id': TestObjects.device.hashid
                })
            })
        }
        describe('function service', async function () {
            serviceTests('function')
        })
        describe('json service', async function () {
            serviceTests('json')
        })
    })
})
