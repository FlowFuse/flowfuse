const sleep = require('util').promisify(setTimeout)

const should = require('should') // eslint-disable-line
const sinon = require('sinon')

const setup = require('../routes/setup')

const FF_UTIL = require('flowforge-test-utils')
const { ExpertCommsHandler } = FF_UTIL.require('forge/comms/expert')

describe('ExpertCommsHandler', function () {
    /**
     * Get a mocked comms client. Only the bits ExpertCommsHandler touches are implemented:
     * on/emit (event subscription) and publish (outgoing heartbeat requests)
     */
    function mockClient () {
        let received = []
        const handlers = {}
        return {
            platformId: 'test-platform-id',
            publish: (topic, payload, opts, callback) => {
                received.push({ topic, payload, opts })
                if (callback) {
                    setImmediate(() => callback())
                }
            },
            on: (event, callback) => {
                handlers[event] = callback
            },
            emit: function () {
                const evt = arguments[0]
                const args = Array.prototype.slice.call(arguments, 1)
                handlers[evt].apply(null, args)
            },
            received: () => received,
            clearReceived: () => { received = [] }
        }
    }

    // Wrap requestBridgeHeartbeat's callback style in a promise so tests can await the outcome
    function invokeHeartbeat (handler, maxResponseTime) {
        return new Promise((resolve) => {
            handler.requestBridgeHeartbeat(maxResponseTime, (err, result) => resolve({ err, result }))
        })
    }

    describe('heartbeat request/response handling', function () {
        let app
        let client
        let handler

        before(async function () {
            app = await setup()
        })

        after(async function () {
            await app.close()
        })

        beforeEach(function () {
            client = mockClient()
            handler = new ExpertCommsHandler(app, client)
        })

        afterEach(async function () {
            clearTimeout(handler.timer)
            sinon.restore()
            // Reset the module-level cache singleton so errorCount/response state doesn't leak between tests
            await app.caches.closeCache()
        })

        it('creates the bridge heartbeat cache with the expected defaults', function () {
            handler.bridgeHeartbeatCache.lru.max.should.equal(100)
            handler.bridgeHeartbeatCache.lru.ttl.should.equal(3 * 60 * 1000)
            handler.bridgeHeartbeatCache.lru.updateAgeOnGet.should.be.true()
        })

        it('registers a listener for response/platform/expert/bridge/heartbeat', async function () {
            const correlationData = 'test-correlation-id'
            client.emit('response/platform/expert/bridge/heartbeat', { timestamp: 123 }, { correlationData })

            const entry = await handler.bridgeHeartbeatCache.get(`response:${correlationData}`)
            entry.payload.should.deepEqual({ timestamp: 123 })
            entry.properties.should.deepEqual({ correlationData })
        })

        it('publishes a heartbeat request with a fresh correlationData and platformId', function () {
            handler.requestBridgeHeartbeat(1000, () => {})

            client.received().should.have.length(1)
            const { topic, payload, opts } = client.received()[0]
            topic.should.equal('ff/v1/expert/forge_platform/bridge/platform/heartbeat/response')
            opts.should.deepEqual({ qos: 1, retain: false, properties: { correlationData: opts.properties.correlationData } })

            const parsed = JSON.parse(payload)
            parsed.should.have.property('platformId', 'test-platform-id')
            parsed.should.have.property('correlationData').which.is.a.String()
            parsed.should.have.property('timestamp').which.is.a.Number()
            parsed.correlationData.should.equal(opts.properties.correlationData)
        })

        it('resolves with errorCount 0 when a matching response arrives before maxResponseTime', async function () {
            const resultPromise = invokeHeartbeat(handler, 30)

            const { payload } = client.received()[0]
            const { correlationData } = JSON.parse(payload)
            client.emit('response/platform/expert/bridge/heartbeat', { ok: true }, { correlationData })

            const { err, result } = await resultPromise
            should(err).be.null()
            result.should.deepEqual({ errorCount: 0 })
        })

        it('removes the cached response once it has been consumed by a successful heartbeat', async function () {
            const resultPromise = invokeHeartbeat(handler, 30)

            const { payload } = client.received()[0]
            const { correlationData } = JSON.parse(payload)
            client.emit('response/platform/expert/bridge/heartbeat', { ok: true }, { correlationData })

            await resultPromise
            const cached = await handler.bridgeHeartbeatCache.get(`response:${correlationData}`)
            should(cached).be.undefined()
        })

        it('ignores a response whose correlationData does not match the in-flight request', async function () {
            const resultPromise = invokeHeartbeat(handler, 30)

            client.emit('response/platform/expert/bridge/heartbeat', { ok: true }, { correlationData: 'someone-elses-request' })

            const { err, result } = await resultPromise
            err.should.be.an.Error()
            result.should.deepEqual({ errorCount: 1 })
        })

        it('reports an incrementing errorCount when no response arrives before maxResponseTime', async function () {
            const first = await invokeHeartbeat(handler, 20)
            first.err.should.be.an.Error()
            first.result.should.deepEqual({ errorCount: 1 })

            const second = await invokeHeartbeat(handler, 20)
            second.err.should.be.an.Error()
            second.result.should.deepEqual({ errorCount: 2 })
        })

        it('resets errorCount back to 0 after a successful heartbeat following prior failures', async function () {
            const first = await invokeHeartbeat(handler, 20)
            first.result.should.deepEqual({ errorCount: 1 })

            const resultPromise = invokeHeartbeat(handler, 30)
            const { payload } = client.received()[1]
            const { correlationData } = JSON.parse(payload)
            client.emit('response/platform/expert/bridge/heartbeat', { ok: true }, { correlationData })

            const { result } = await resultPromise
            result.should.deepEqual({ errorCount: 0 })
        })

        it('clears any pending timer when called again before it fires', async function () {
            let firstCallbackCalled = false
            handler.requestBridgeHeartbeat(1000, () => { firstCallbackCalled = true })

            const second = await invokeHeartbeat(handler, 20)

            firstCallbackCalled.should.be.false()
            second.result.should.deepEqual({ errorCount: 1 })
        })

        it('does not throw when no callback is supplied', async function () {
            handler.requestBridgeHeartbeat(20)
            await sleep(30) // let the timer fire; mocha fails the test if this throws/rejects
        })

        it('forwards an error to the callback if reading the cached response fails', async function () {
            const realGet = handler.bridgeHeartbeatCache.get.bind(handler.bridgeHeartbeatCache)
            sinon.stub(handler.bridgeHeartbeatCache, 'get').callsFake((key) => {
                if (key.startsWith('response:')) {
                    return Promise.reject(new Error('cache read failed'))
                }
                return realGet(key)
            })

            const { err, result } = await invokeHeartbeat(handler, 20)
            err.message.should.match(/cache read failed/)
            should(result).be.undefined()
        })
    })

    describe('with configured centralBroker.bridgeCache options', function () {
        let configuredApp

        before(async function () {
            configuredApp = await setup({ expert: { centralBroker: { heartbeat: { bridgeCacheMax: 5, bridgeCacheTTL: 42000 } } } })
        })

        after(async function () {
            await configuredApp.close()
        })

        it('uses app.config.expert.centralBroker.heartbeat.bridgeCacheMax instead of the default', function () {
            const configuredHandler = new ExpertCommsHandler(configuredApp, mockClient())
            configuredHandler.bridgeHeartbeatCache.lru.max.should.equal(5)
        })

        it('uses app.config.expert.centralBroker.heartbeat.bridgeCacheTTL instead of the default', function () {
            const configuredHandler = new ExpertCommsHandler(configuredApp, mockClient())
            configuredHandler.bridgeHeartbeatCache.lru.ttl.should.equal(42000)
        })
    })
})
