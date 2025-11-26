const { default: axios } = require('axios')
const should = require('should') // eslint-disable-line
const sinon = require('sinon')

const setup = require('../setup')

describe('Assistant API', async function () {
    async function setupApp (config = {}, { tablesFeatureEnabled = true, assistantInlineCompletionsFeatureEnabled = true } = {}) {
        const defaultConfig = {
            features: { devices: true, tables: true },
            assistant: {
                enabled: true,
                service: {
                    url: 'http://localhost:9876'
                },
                token: 'blah',
                assetCache: {
                    max: 10,
                    ttl: 1000 // 1 second TTL for testing
                },
                tablesSchemaCache: {
                    max: 10,
                    ttl: 400 // 400ms TTL for testing
                },
                completions: {
                    enabled: true,
                    inlineEnabled: true
                }
            }
        }
        const mergedConfig = Object.assign({}, defaultConfig, config)
        const _app = await setup(mergedConfig)
        _app.comms = null // skip all the broker stuff
        _app.config.features.register('tables', tablesFeatureEnabled, tablesFeatureEnabled)
        _app.config.features.register('assistantInlineCompletions', assistantInlineCompletionsFeatureEnabled, assistantInlineCompletionsFeatureEnabled)
        // Enable tables feature for default team type
        const defaultTeamType = await _app.db.models.TeamType.findOne({ where: { name: 'starter' } })
        const defaultTeamTypeProperties = defaultTeamType.properties
        defaultTeamTypeProperties.features.tables = true
        defaultTeamType.properties = defaultTeamTypeProperties
        await defaultTeamType.save()
        return _app
    }
    async function enableTeamTypeFeatureFlag (app, enabled, featureName, teamTypeName = 'starter') {
        const defaultTeamType = await app.db.models.TeamType.findOne({ where: { name: teamTypeName } })
        const defaultTeamTypeProperties = defaultTeamType.properties
        defaultTeamTypeProperties.features[featureName] = enabled
        defaultTeamTypeProperties.enableAllFeatures = false
        defaultTeamType.properties = defaultTeamTypeProperties
        await defaultTeamType.save()
    }
    describe('service disabled', async function () {
        let app2
        afterEach(async function () {
            if (app2) {
                await app2.close()
            }
        })
        it('should return 501 if assistant service is disabled', async function () {
            app2 = await setupApp({ assistant: { enabled: false } })
            const instance = app2.project
            const token = (await instance.refreshAuthTokens()).token
            sinon.stub(app2.config.assistant, 'enabled').get(() => false)
            const response = await app2.inject({
                method: 'POST',
                url: '/api/v1/assistant/function',
                headers: { authorization: 'Bearer ' + token },
                payload: { prompt: 'multiply by 5', transactionId: '1234' }
            })
            response.statusCode.should.equal(501)
        })
        it('should return 501 if assistant service url is not set', async function () {
            app2 = await setupApp({ assistant: { enabled: true, service: { url: null } } })
            const instance = app2.project
            const token = (await instance.refreshAuthTokens()).token
            const response = await app2.inject({
                method: 'POST',
                url: '/api/v1/assistant/function',
                headers: { authorization: 'Bearer ' + token },
                payload: { prompt: 'multiply by 5', transactionId: '1234' }
            })
            response.statusCode.should.equal(501)
        })
    })

    describe('service enabled', async function () {
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

        before(async function () {
            app = await setupApp()
            factory = app.factory
            TestObjects.tokens.alice = await login(app, 'alice', 'aaPassword')
            TestObjects.ATeam = await app.db.models.Team.byName('ATeam')
            TestObjects.instance = app.project
            TestObjects.Application1 = app.application
            TestObjects.tokens.instance = (await TestObjects.instance.refreshAuthTokens()).token
            TestObjects.device = await factory.createDevice({ name: 'device1' }, TestObjects.ATeam, null, TestObjects.Application1)
            TestObjects.tokens.device = (await TestObjects.device.refreshAuthTokens()).token
        })
        after(async function () {
            await app.close()
        })
        afterEach(async function () {
            sinon.restore()
        })

        async function login (app, username, password) {
            const response = await app.inject({
                method: 'POST',
                url: '/account/login',
                payload: { username, password, remember: false }
            })
            response.cookies.should.have.length(1)
            response.cookies[0].should.have.property('name', 'sid')
            return response.cookies[0].value
        }
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
            beforeEach(async function () {
                // Mock license tier and team feature flag
                sinon.stub(app.license, 'get').callsFake((k) => (k === 'tier' ? 'enterprise' : undefined))
                sinon.stub(app.license, 'active').callsFake(() => true)
            })
            afterEach(function () {
                sinon.restore()
            })

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
                    sinon.stub(axios, 'post').resolves({ data: { status: 'ok', transactionId: '1234' } })
                    const response = await app.inject({
                        method: 'POST',
                        url: `/api/v1/assistant/${serviceName}`,
                        headers: { authorization: 'Bearer ' + device.credentials.token },
                        payload: { prompt: 'multiply by 5', transactionId: '1234' }
                    })
                    axios.post.calledOnce.should.be.true()

                    const body = response.json()
                    body.should.have.property('transactionId', '1234')

                    response.statusCode.should.equal(200)
                })
                it('instance token can access', async function () {
                    sinon.stub(axios, 'post').resolves({ data: { status: 'ok', transactionId: '4321' } })
                    const response = await app.inject({
                        method: 'POST',
                        url: `/api/v1/assistant/${serviceName}`,
                        headers: { authorization: 'Bearer ' + TestObjects.tokens.instance },
                        payload: { prompt: 'multiply by 5', transactionId: '4321' }
                    })
                    axios.post.calledOnce.should.be.true()
                    const body = response.json()
                    body.should.have.property('transactionId', '4321')
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
                it('fails when transactionId is mismatched', async function () {
                    sinon.stub(axios, 'post').resolves({ data: { status: 'ok', transactionId: 'originator-id' } })
                    const response = await app.inject({
                        method: 'POST',
                        url: `/api/v1/assistant/${serviceName}`,
                        headers: { authorization: 'Bearer ' + TestObjects.tokens.instance },
                        payload: { prompt: 'multiply by 5', transactionId: 'deliberately-incorrect-id' }
                    })
                    response.statusCode.should.equal(500)
                })
                it('contains owner info in headers for an instance', async function () {
                    sinon.stub(axios, 'post').resolves({ data: { status: 'ok', transactionId: '11223344' } })
                    const response = await app.inject({
                        method: 'POST',
                        url: `/api/v1/assistant/${serviceName}`,
                        headers: { authorization: 'Bearer ' + TestObjects.tokens.instance },
                        payload: { prompt: 'multiply by 5', transactionId: '11223344' }
                    })
                    axios.post.calledOnce.should.be.true()
                    axios.post.args[0][2].headers.should.have.properties({
                        'ff-owner-type': 'project',
                        'ff-owner-id': TestObjects.instance.id,
                        'ff-team-id': TestObjects.ATeam.hashid,
                        'ff-license-active': true,
                        'ff-license-type': 'EE',
                        'ff-license-tier': 'enterprise'
                    })
                    const body = response.json()
                    body.should.have.property('transactionId', '11223344')
                })
                it('contains owner info in headers for a device', async function () {
                    sinon.stub(axios, 'post').resolves({ data: { status: 'ok', transactionId: '9876' } })
                    const response = await app.inject({
                        method: 'POST',
                        url: `/api/v1/assistant/${serviceName}`,
                        headers: { authorization: 'Bearer ' + TestObjects.tokens.device },
                        payload: { prompt: 'multiply by 5', transactionId: '9876' }
                    })
                    axios.post.calledOnce.should.be.true()
                    axios.post.args[0][2].headers.should.have.properties({
                        'ff-owner-type': 'device',
                        'ff-owner-id': TestObjects.device.hashid,
                        'ff-team-id': TestObjects.ATeam.hashid,
                        'ff-license-active': true,
                        'ff-license-type': 'EE',
                        'ff-license-tier': 'enterprise'
                    })
                    const body = response.json()
                    body.should.have.property('transactionId', '9876')
                })
            }
            describe('function service', async function () {
                serviceTests('function')
            })
            describe('json service', async function () {
                serviceTests('json')
            })
            describe('flowfuse-tables-query service', async function () {
                const serviceName = 'flowfuse-tables-query'
                let getTablesHintsStub
                let getDatabasesStub
                const libAssistant = require('../../../../../forge/lib/assistant.js')

                beforeEach(function () {
                    getTablesHintsStub = sinon.stub(libAssistant, 'getTablesHints')
                    app.tables = app.tables || { getDatabases: () => {} }
                    getDatabasesStub = sinon.stub(app.tables, 'getDatabases').resolves([{ hashid: 'db1', name: 'Database 1' }])
                })
                afterEach(function () {
                    getTablesHintsStub.restore()
                    getDatabasesStub.restore()
                    sinon.restore()
                })

                // standard service tests
                serviceTests(serviceName)

                // specific tests for tables feature
                it('should include tables hints in context and cache it for subsequent requests', async function () {
                    // deliberate pause to ensure getTablesHints cache is expired before starting test
                    await new Promise(resolve => setTimeout(resolve, 760))
                    getTablesHintsStub.resolves('CREATE TABLE test (id INT PRIMARY KEY);\nCREATE TABLE test2 (id INT PRIMARY KEY);\n')
                    sinon.stub(axios, 'post').resolves({ data: { status: 'ok' } })
                    await app.inject({
                        method: 'POST',
                        url: `/api/v1/assistant/${serviceName}`,
                        headers: { authorization: 'Bearer ' + TestObjects.tokens.device },
                        payload: { prompt: 'select all rows from test', transactionId: '555' }
                    })
                    axios.post.calledOnce.should.be.true()
                    getTablesHintsStub.calledOnce.should.be.true()
                    getDatabasesStub.calledOnce.should.be.true()
                    // should be called with app, request.team, database.hashid
                    const callArgs = getTablesHintsStub.getCall(0).args
                    callArgs[1].should.be.an.Object()
                    callArgs[1].should.have.property('id', TestObjects.ATeam.id)
                    callArgs[1].should.have.property('hashid', TestObjects.ATeam.hashid)
                    callArgs[1].should.have.property('name', TestObjects.ATeam.name)
                    callArgs[2].should.equal('db1') // instance/device.hashid (mocked in beforeEach)

                    // Second request should hit cache and not call out to getTablesHints a 2nd time
                    await app.inject({
                        method: 'POST',
                        url: `/api/v1/assistant/${serviceName}`,
                        headers: { authorization: 'Bearer ' + TestObjects.tokens.device },
                        payload: { prompt: 'select all rows from test', transactionId: '555' }
                    })
                    axios.post.calledTwice.should.be.true()
                    getTablesHintsStub.calledOnce.should.be.true() // still only called once
                    getDatabasesStub.calledOnce.should.be.true() // still only called once
                })

                it('should fetch fresh tables context hints after cache expiration', async function () {
                    getTablesHintsStub.resolves('--empty db')
                    getTablesHintsStub.resetHistory()
                    getDatabasesStub.resetHistory()
                    sinon.stub(axios, 'post').resolves({ data: { status: 'ok' } })
                    await app.inject({
                        method: 'POST',
                        url: `/api/v1/assistant/${serviceName}`,
                        headers: { authorization: 'Bearer ' + TestObjects.tokens.device },
                        payload: { prompt: 'select all rows from test', transactionId: '555' }
                    })
                    axios.post.calledOnce.should.be.true()

                    // Simulate cache expiration
                    await new Promise(resolve => setTimeout(resolve, 760)) // wait longer than cache TTL setting

                    // Second request should hit cache and not call out to getTablesHints a 2nd time
                    getTablesHintsStub.resolves('CREATE TABLE test (id INT PRIMARY KEY);\nCREATE TABLE test2 (id INT PRIMARY KEY);\n')
                    getTablesHintsStub.resetHistory()
                    getDatabasesStub.resetHistory()
                    await app.inject({
                        method: 'POST',
                        url: `/api/v1/assistant/${serviceName}`,
                        headers: { authorization: 'Bearer ' + TestObjects.tokens.device },
                        payload: { prompt: 'select all rows from test', transactionId: '555' }
                    })
                    axios.post.calledTwice.should.be.true()
                    getTablesHintsStub.called.should.be.true()
                    getDatabasesStub.called.should.be.true()
                    // should be called with app, request.team, database.hashid
                    const callArgs = getTablesHintsStub.getCall(0).args
                    callArgs[1].should.be.an.Object()
                    callArgs[1].should.have.property('id', TestObjects.ATeam.id)
                    callArgs[1].should.have.property('hashid', TestObjects.ATeam.hashid)
                    callArgs[1].should.have.property('name', TestObjects.ATeam.name)
                    callArgs[2].should.equal('db1') // instance/device.hashid (mocked in beforeEach)
                    const returnValue = await getTablesHintsStub.getCall(0).returnValue
                    returnValue.should.equal('CREATE TABLE test (id INT PRIMARY KEY);\nCREATE TABLE test2 (id INT PRIMARY KEY);\n')
                })
            })
            describe('fim code completion service', async function () {
                const serviceName = 'fim/node-red/function'
                let getTablesHintsStub
                let getDatabasesStub
                const libAssistant = require('../../../../../forge/lib/assistant.js')

                beforeEach(async function () {
                    getTablesHintsStub = sinon.stub(libAssistant, 'getTablesHints')
                    app.tables = app.tables || { getDatabases: () => {} }
                    getDatabasesStub = sinon.stub(app.tables, 'getDatabases').resolves([{ hashid: 'db1', name: 'Database 1' }])
                    await enableTeamTypeFeatureFlag(app, true, 'assistantInlineCompletions')
                })
                afterEach(function () {
                    getTablesHintsStub.restore()
                    getDatabasesStub.restore()
                    sinon.restore()
                })

                // standard service tests
                serviceTests(serviceName)

                // specific tests
                it('can be disabled', async function () {
                    sinon.stub(app.config.assistant.completions, 'inlineEnabled').get(() => false)
                    const response = await app.inject({
                        method: 'POST',
                        url: `/api/v1/assistant/${serviceName}`,
                        headers: { authorization: 'Bearer ' + TestObjects.tokens.device },
                        payload: { prompt: 'select all rows from test', transactionId: '555' }
                    })
                    response.statusCode.should.equal(404)
                })
                it('can be disabled via team feature flag', async function () {
                    await enableTeamTypeFeatureFlag(app, false, 'assistantInlineCompletions')
                    const response = await app.inject({
                        method: 'POST',
                        url: `/api/v1/assistant/${serviceName}`,
                        headers: { authorization: 'Bearer ' + TestObjects.tokens.device },
                        payload: { prompt: 'select all rows from test', transactionId: '555' }
                    })
                    response.statusCode.should.equal(404)
                })
                it('does not allow other contrib nodes', async function () {
                    const serviceName = 'fim/' + encodeURIComponent('@third-party/contrib-node') + '/node-type'
                    const response = await app.inject({
                        method: 'POST',
                        url: `/api/v1/assistant/${serviceName}`,
                        headers: { authorization: 'Bearer ' + TestObjects.tokens.device },
                        payload: { prompt: 'select all rows from test', transactionId: '555', disableTables: true }
                    })
                    response.statusCode.should.equal(400)
                })
                it('should include tables hints in context and cache it for subsequent requests', async function () {
                    // deliberate pause to ensure getTablesHints cache is expired before starting test
                    await new Promise(resolve => setTimeout(resolve, 760))
                    getTablesHintsStub.resolves('CREATE TABLE test (id INT PRIMARY KEY);\nCREATE TABLE test2 (id INT PRIMARY KEY);\n')
                    getTablesHintsStub.resetHistory()
                    const serviceName = 'fim/' + encodeURIComponent('@flowfuse/nr-tables-nodes') + '/tables-query'
                    sinon.stub(axios, 'post').resolves({ data: { status: 'ok' } })
                    await app.inject({
                        method: 'POST',
                        url: `/api/v1/assistant/${serviceName}`,
                        headers: { authorization: 'Bearer ' + TestObjects.tokens.device },
                        payload: { prompt: 'select all rows from test', transactionId: '555' }
                    })
                    axios.post.calledOnce.should.be.true()
                    getTablesHintsStub.calledOnce.should.be.true()
                    getDatabasesStub.calledOnce.should.be.true()
                    // should be called with app, request.team, database.hashid
                    const callArgs = getTablesHintsStub.getCall(0).args
                    callArgs[1].should.be.an.Object()
                    callArgs[1].should.have.property('id', TestObjects.ATeam.id)
                    callArgs[1].should.have.property('hashid', TestObjects.ATeam.hashid)
                    callArgs[1].should.have.property('name', TestObjects.ATeam.name)
                    callArgs[2].should.equal('db1') // instance/device.hashid (mocked in beforeEach)

                    // Second request should hit cache and not call out to getTablesHints a 2nd time
                    await app.inject({
                        method: 'POST',
                        url: `/api/v1/assistant/${serviceName}`,
                        headers: { authorization: 'Bearer ' + TestObjects.tokens.device },
                        payload: { prompt: 'select all rows from test', transactionId: '555' }
                    })
                    axios.post.calledTwice.should.be.true()
                    getTablesHintsStub.calledOnce.should.be.true() // still only called once
                    getDatabasesStub.calledOnce.should.be.true() // still only called once
                })

                it('should fetch fresh tables context hints after cache expiration', async function () {
                    getTablesHintsStub.resolves('--empty db')
                    getTablesHintsStub.resetHistory()
                    getDatabasesStub.resetHistory()
                    const serviceName = 'fim/' + encodeURIComponent('@flowfuse/nr-tables-nodes') + '/tables-query'
                    sinon.stub(axios, 'post').resolves({ data: { status: 'ok' } })
                    await app.inject({
                        method: 'POST',
                        url: `/api/v1/assistant/${serviceName}`,
                        headers: { authorization: 'Bearer ' + TestObjects.tokens.device },
                        payload: { prompt: 'select all rows from test', transactionId: '555' }
                    })
                    axios.post.calledOnce.should.be.true()

                    // Simulate cache expiration
                    await new Promise(resolve => setTimeout(resolve, 760)) // wait longer than cache TTL setting

                    // Second request should hit cache and not call out to getTablesHints a 2nd time
                    getTablesHintsStub.resolves('CREATE TABLE test (id INT PRIMARY KEY);\nCREATE TABLE test2 (id INT PRIMARY KEY);\n')
                    getTablesHintsStub.resetHistory()
                    getDatabasesStub.resetHistory()
                    await app.inject({
                        method: 'POST',
                        url: `/api/v1/assistant/${serviceName}`,
                        headers: { authorization: 'Bearer ' + TestObjects.tokens.device },
                        payload: { prompt: 'select all rows from test', transactionId: '555' }
                    })
                    axios.post.calledTwice.should.be.true()
                    getTablesHintsStub.called.should.be.true()
                    getDatabasesStub.called.should.be.true()
                    // should be called with app, request.team, database.hashid
                    const callArgs = getTablesHintsStub.getCall(0).args
                    callArgs[1].should.be.an.Object()
                    callArgs[1].should.have.property('id', TestObjects.ATeam.id)
                    callArgs[1].should.have.property('hashid', TestObjects.ATeam.hashid)
                    callArgs[1].should.have.property('name', TestObjects.ATeam.name)
                    callArgs[2].should.equal('db1') // instance/device.hashid (mocked in beforeEach)
                    const returnValue = await getTablesHintsStub.getCall(0).returnValue
                    returnValue.should.equal('CREATE TABLE test (id INT PRIMARY KEY);\nCREATE TABLE test2 (id INT PRIMARY KEY);\n')
                })
            })
        })

        describe('assets endpoint', async function () {
            const assetUrl1 = '/api/v1/assistant/assets/model.json'
            const assetUrl2 = '/api/v1/assistant/assets/model.bin'
            const assetUrl3 = '/api/v1/assistant/assets/vocabulary.json'
            let axiosGetStub

            beforeEach(function () {
                axiosGetStub = sinon.stub(axios, 'get')
            })
            afterEach(function () {
                sinon.restore()
            })

            it('should return 401 for anonymous access', async function () {
                const response = await app.inject({
                    method: 'GET',
                    url: assetUrl1
                })
                response.statusCode.should.equal(401)
            })

            it('should return 401 for random token', async function () {
                const response = await app.inject({
                    method: 'GET',
                    url: assetUrl1,
                    headers: { authorization: 'Bearer blah-blah' }
                })
                response.statusCode.should.equal(401)
            })

            it('should return 401 for user token', async function () {
                const response = await app.inject({
                    method: 'GET',
                    url: assetUrl1,
                    cookies: { sid: TestObjects.tokens.alice }
                })
                response.statusCode.should.equal(401)
            })

            it('should return 400 for missing asset path', async function () {
                const response = await app.inject({
                    method: 'GET',
                    url: '/api/v1/assistant/assets/',
                    headers: { authorization: 'Bearer ' + TestObjects.tokens.device }
                })
                response.statusCode.should.equal(400)
                response.json().should.have.property('code', 'invalid_path')
            })

            it('should return 400 for asset path starting with slash', async function () {
                const response = await app.inject({
                    method: 'GET',
                    url: '/api/v1/assistant/assets//bad',
                    headers: { authorization: 'Bearer ' + TestObjects.tokens.device }
                })
                response.statusCode.should.equal(400)
                response.json().should.have.property('code', 'invalid_path')
            })

            it('should handle upstream error', async function () {
                axiosGetStub.rejects({
                    response: { status: 404, data: { code: 'not_found', error: 'Not found' } },
                    message: 'Not found'
                })
                const response = await app.inject({
                    method: 'GET',
                    url: '/api/v1/assistant/assets/nonexistent.json',
                    headers: { authorization: 'Bearer ' + TestObjects.tokens.device }
                })
                response.statusCode.should.equal(404)
                response.json().should.have.property('code', 'not_found')
            })

            it('should fetch and cache asset for device token', async function () {
                const fakeBuffer = Buffer.from('test-asset')
                axiosGetStub.resolves({
                    status: 200,
                    headers: { 'content-type': 'application/octet-stream' },
                    data: fakeBuffer
                })
                const response = await app.inject({
                    method: 'GET',
                    url: assetUrl1,
                    headers: { authorization: 'Bearer ' + TestObjects.tokens.device }
                })
                response.statusCode.should.equal(200)
                response.headers['content-type'].should.equal('application/octet-stream')
                Buffer.from(response.rawPayload).toString().should.equal('test-asset')
                axiosGetStub.calledOnce.should.be.true()

                // Second request should hit cache and not call axios.get again
                axiosGetStub.resetHistory()
                const response2 = await app.inject({
                    method: 'GET',
                    url: assetUrl1,
                    headers: { authorization: 'Bearer ' + TestObjects.tokens.device }
                })
                response2.statusCode.should.equal(200)
                Buffer.from(response2.rawPayload).toString().should.equal('test-asset')
                axiosGetStub.called.should.be.false()
            })

            it('should fetch and cache asset for instance token', async function () {
                const fakeBuffer = Buffer.from('instance-asset')
                axiosGetStub.resolves({
                    status: 200,
                    headers: { 'content-type': 'application/octet-stream' },
                    data: fakeBuffer
                })
                const response = await app.inject({
                    method: 'GET',
                    url: assetUrl2,
                    headers: { authorization: 'Bearer ' + TestObjects.tokens.instance }
                })
                response.statusCode.should.equal(200)
                response.headers['content-type'].should.equal('application/octet-stream')
                Buffer.from(response.rawPayload).toString().should.equal('instance-asset')
            })

            it('should fetch fresh after cache expiration', async function () {
                const fakeBuffer = Buffer.from('test-asset')
                axiosGetStub.resolves({
                    status: 200,
                    headers: { 'content-type': 'application/octet-stream' },
                    data: fakeBuffer
                })
                const response = await app.inject({
                    method: 'GET',
                    url: assetUrl3,
                    headers: { authorization: 'Bearer ' + TestObjects.tokens.device }
                })
                response.statusCode.should.equal(200)
                response.headers['content-type'].should.equal('application/octet-stream')
                Buffer.from(response.rawPayload).toString().should.equal('test-asset')
                axiosGetStub.calledOnce.should.be.true()

                // Simulate cache expiration
                await new Promise(resolve => setTimeout(resolve, 1010)) // wait for over 1 sec

                const response2 = await app.inject({
                    method: 'GET',
                    url: assetUrl3,
                    headers: { authorization: 'Bearer ' + TestObjects.tokens.device }
                })
                response2.statusCode.should.equal(200)
                Buffer.from(response2.rawPayload).toString().should.equal('test-asset')
                axiosGetStub.calledTwice.should.be.true() // should call axios.get again after cache clear
            })

            it('should return ok headers and strip all others', async function () {
                const upstreamHeaders = {
                    connection: 'upstream-value',
                    'content-type': 'application/octet-stream'
                }
                const shouldStripHeaders = {
                    'keep-alive': 'should-be-stripped',
                    'proxy-authenticate': 'should-be-stripped',
                    'proxy-authorization': 'should-be-stripped',
                    te: 'should-be-stripped',
                    trailer: 'should-be-stripped',
                    upgrade: 'should-be-stripped',
                    server: 'should-be-stripped',
                    'x-powered-by': 'should-be-stripped',
                    'x-asset-cache-hit': 'should-be-stripped',
                    'x-asset-cache-miss': 'should-be-stripped',
                    'x-asset-cache-age': 'should-be-stripped',
                    'x-internal-header': 'should-be-stripped'
                }

                const okHeaders = {
                    'content-type': 'application/octet-stream',
                    'content-length': '*',
                    date: '*',
                    expires: '*',
                    'last-modified': '*',
                    'cache-control': 'public, max-age=1800',
                    vary: '*',
                    'accept-ranges': '*',
                    age: '*'
                }

                axiosGetStub.resolves({
                    status: 200,
                    headers: {
                        ...upstreamHeaders,
                        ...shouldStripHeaders,
                        ...okHeaders
                    },
                    data: Buffer.from('test-asset')
                })
                const response = await app.inject({
                    method: 'GET',
                    url: assetUrl1,
                    headers: { authorization: 'Bearer ' + TestObjects.tokens.device }
                })
                response.statusCode.should.equal(200)
                response.headers.should.not.have.property('connection', 'upstream-value') // connection can be present but not the header from upstream
                // scan for any header with value 'should-be-stripped'
                Object.keys(shouldStripHeaders).forEach(header => {
                    response.headers.should.not.have.property(header)
                })
                Object.keys(okHeaders).forEach(header => {
                    response.headers.should.have.property(header)
                })
                response.headers['content-type'].should.equal('application/octet-stream')
                Buffer.from(response.rawPayload).toString().should.equal('test-asset')
                axiosGetStub.calledOnce.should.be.true()
            })
        })
    })
})
