const redisClient = require('@redis/client')

const should = require('should') // eslint-disable-line
const sinon = require('sinon')

const REDIS_CACHE_PATH = '../../../../forge/caches/redis-cache.js'

describe('Redis Cache', function () {
    let redisCache
    let fakeClient
    let createClientStub
    let fakeApp

    beforeEach(function () {
        fakeClient = {
            on: sinon.stub(),
            connect: sinon.stub().resolves(),
            close: sinon.stub().resolves(),
            isOpen: true,
            hGet: sinon.stub(),
            hSet: sinon.stub().resolves(),
            hDel: sinon.stub().resolves(),
            hKeys: sinon.stub(),
            hGetAll: sinon.stub(),
            hpExpire: sinon.stub().resolves()
        }
        createClientStub = sinon.stub(redisClient, 'createClient').returns(fakeClient)
        delete require.cache[require.resolve(REDIS_CACHE_PATH)]
        redisCache = require(REDIS_CACHE_PATH)
        fakeApp = { log: { info: sinon.stub(), error: sinon.stub() } }
    })

    afterEach(function () {
        sinon.restore()
    })

    describe('initCache', function () {
        it('creates a client with the supplied options', async function () {
            await redisCache.initCache({ url: 'redis://localhost:6379' }, fakeApp)
            createClientStub.calledOnce.should.be.true()
            const opts = createClientStub.firstCall.args[0]
            opts.url.should.equal('redis://localhost:6379')
        })

        it('attaches a reconnectStrategy that backs off and is bounded', async function () {
            await redisCache.initCache({}, fakeApp)
            const opts = createClientStub.firstCall.args[0]
            opts.socket.should.have.property('reconnectStrategy').which.is.a.Function()

            const d0 = opts.socket.reconnectStrategy(0)
            const d3 = opts.socket.reconnectStrategy(3)
            const d10 = opts.socket.reconnectStrategy(10)

            d0.should.be.belowOrEqual(50 + 200) // 2^0 * 50 + jitter
            d3.should.be.aboveOrEqual(d0)
            d10.should.be.belowOrEqual(2000 + 200) // capped at 2000ms + max jitter
        })

        it('connects the client', async function () {
            await redisCache.initCache({}, fakeApp)
            fakeClient.connect.calledOnce.should.be.true()
        })

        it('registers handlers for error/end/reconnecting/connected/ready', async function () {
            await redisCache.initCache({}, fakeApp)
            const events = fakeClient.on.getCalls().map(c => c.args[0])
            events.should.containDeep(['error', 'end', 'reconnecting', 'connected', 'ready'])
        })

        it('logs on error/reconnecting/ready handlers', async function () {
            await redisCache.initCache({}, fakeApp)
            const handlers = {}
            for (const call of fakeClient.on.getCalls()) {
                handlers[call.args[0]] = call.args[1]
            }
            handlers.error(new Error('boom'))
            handlers.reconnecting()
            handlers.ready()
            fakeApp.log.info.callCount.should.be.aboveOrEqual(3)
        })

        it('swallows connect errors so the plugin does not crash', async function () {
            fakeClient.connect.rejects(new Error('cannot connect'))
            await redisCache.initCache({}, fakeApp) // must not throw
        })
    })

    describe('createCache / getCache', function () {
        beforeEach(async function () {
            await redisCache.initCache({}, fakeApp)
        })

        it('createCache returns a Cache exposing the expected methods', function () {
            const cache = redisCache.createCache('c1')
            cache.should.have.property('get').which.is.a.Function()
            cache.should.have.property('set').which.is.a.Function()
            cache.should.have.property('del').which.is.a.Function()
            cache.should.have.property('keys').which.is.a.Function()
            cache.should.have.property('all').which.is.a.Function()
        })

        it('createCache is idempotent for the same name', function () {
            const a = redisCache.createCache('c1')
            const b = redisCache.createCache('c1')
            a.should.equal(b)
        })

        it('createCache creates distinct caches for distinct names', function () {
            const a = redisCache.createCache('c1')
            const b = redisCache.createCache('c2')
            a.should.not.equal(b)
        })

        it('getCache creates with default options if it does not exist', function () {
            const cache = redisCache.getCache('autoCreated')
            cache.should.have.property('get').which.is.a.Function()
            cache.should.have.property('set').which.is.a.Function()
            should(cache.ttl).be.undefined()
            // subsequent getCache returns the same instance
            redisCache.getCache('autoCreated').should.equal(cache)
        })

        it('getCache creates with specified options if it does not exist', function () {
            const cache = redisCache.getCache('autoCreatedTTL', { ttl: 1234 })
            cache.ttl.should.equal(1234)
            // options on subsequent calls are ignored — the existing instance wins
            const second = redisCache.getCache('autoCreatedTTL', { ttl: 9999 })
            second.should.equal(cache)
            second.ttl.should.equal(1234)
        })

        it('getCache returns the previously created cache', function () {
            const created = redisCache.createCache('c1')
            const fetched = redisCache.getCache('c1')
            fetched.should.equal(created)
        })
    })

    describe('Cache operations', function () {
        let cache

        beforeEach(async function () {
            await redisCache.initCache({}, fakeApp)
            cache = redisCache.createCache('mycache')
        })

        describe('get', function () {
            it('returns the JSON-parsed value', async function () {
                fakeClient.hGet.resolves(JSON.stringify({ a: 1 }))
                const val = await cache.get('k')
                val.should.deepEqual({ a: 1 })
                fakeClient.hGet.calledOnceWith('mycache', 'k').should.be.true()
            })

            it('returns undefined when the key is missing', async function () {
                fakeClient.hGet.resolves(null)
                const val = await cache.get('missing')
                should(val).be.undefined()
            })

            it('round-trips strings, numbers, arrays', async function () {
                fakeClient.hGet.resolves(JSON.stringify('hello'))
                ;(await cache.get('k')).should.equal('hello')

                fakeClient.hGet.resolves(JSON.stringify(42))
                ;(await cache.get('k')).should.equal(42)

                fakeClient.hGet.resolves(JSON.stringify([1, 'two', { three: 3 }]))
                ;(await cache.get('k')).should.deepEqual([1, 'two', { three: 3 }])
            })
        })

        describe('set', function () {
            it('JSON-stringifies the value into the named hash', async function () {
                await cache.set('k', { a: 1 })
                fakeClient.hSet
                    .calledOnceWith('mycache', 'k', JSON.stringify({ a: 1 }))
                    .should.be.true()
            })

            it('returns the value passed in', async function () {
                const v = { a: 1 }
                ;(await cache.set('k', v)).should.equal(v)
            })

            it('stringifies primitives', async function () {
                await cache.set('k', 'hello')
                fakeClient.hSet.firstCall.args[2].should.equal(JSON.stringify('hello'))

                await cache.set('k2', 42)
                fakeClient.hSet.secondCall.args[2].should.equal(JSON.stringify(42))
            })

            it('does not call hpExpire when no ttl is set on the cache', async function () {
                await cache.set('k', 'v')
                fakeClient.hpExpire.called.should.be.false()
            })

            it('calls hpExpire with the cache ttl when one is configured', async function () {
                const ttlCache = redisCache.createCache('ttlcache', { ttl: 5000 })
                await ttlCache.set('k', 'v')
                fakeClient.hpExpire.calledOnce.should.be.true()
                const args = fakeClient.hpExpire.firstCall.args
                args[0].should.equal('ttlcache')
                // tolerate either (key, ms, fields) or (key, fields, ms) call shapes
                JSON.stringify(args).should.containEql('5000')
                JSON.stringify(args).should.containEql('"k"')
            })
        })

        describe('del', function () {
            it('calls hDel on the named hash', async function () {
                await cache.del('k')
                fakeClient.hDel.calledOnceWith('mycache', 'k').should.be.true()
            })
        })

        describe('keys', function () {
            it('returns the result of hKeys', async function () {
                fakeClient.hKeys.resolves(['a', 'b', 'c'])
                const keys = await cache.keys()
                keys.should.deepEqual(['a', 'b', 'c'])
                fakeClient.hKeys.calledOnceWith('mycache').should.be.true()
            })

            it('returns an empty array when the hash is empty', async function () {
                fakeClient.hKeys.resolves([])
                ;(await cache.keys()).should.deepEqual([])
            })
        })

        describe('all', function () {
            it('returns a JSON-parsed map of every field', async function () {
                fakeClient.hGetAll.resolves({
                    a: JSON.stringify(1),
                    b: JSON.stringify({ x: 2 }),
                    c: JSON.stringify('three')
                })
                const all = await cache.all()
                all.should.deepEqual({ a: 1, b: { x: 2 }, c: 'three' })
                fakeClient.hGetAll.calledOnceWith('mycache').should.be.true()
            })

            it('returns an empty object when the hash is empty', async function () {
                fakeClient.hGetAll.resolves({})
                ;(await cache.all()).should.deepEqual({})
            })
        })
    })

    describe('closeCache', function () {
        it('closes the client when it is open', async function () {
            await redisCache.initCache({}, fakeApp)
            fakeClient.isOpen = true
            await redisCache.closeCache()
            fakeClient.close.calledOnce.should.be.true()
        })

        it('does not call close when the client is not open', async function () {
            await redisCache.initCache({}, fakeApp)
            fakeClient.isOpen = false
            await redisCache.closeCache()
            fakeClient.close.called.should.be.false()
        })

        it('swallows errors thrown during close', async function () {
            await redisCache.initCache({}, fakeApp)
            fakeClient.close.rejects(new Error('boom'))
            await redisCache.closeCache() // must not throw
        })

        it('does not throw when the client was never initialized', async function () {
            await redisCache.closeCache() // must not throw
        })
    })
})
