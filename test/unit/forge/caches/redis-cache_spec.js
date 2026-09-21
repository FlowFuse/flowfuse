const redisClient = require('@redis/client')

const should = require('should')
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
            hpExpire: sinon.stub().resolves(),
            hScan: sinon.stub()
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

        it('passes updateAgeOnGet through to the cache', function () {
            const cache = redisCache.createCache('aged', { ttl: 5000, updateAgeOnGet: true })
            cache.updateAgeOnGet.should.be.true()
            const plain = redisCache.createCache('plain')
            plain.updateAgeOnGet.should.be.false()
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

            it('rejects a non-string key', async function () {
                await cache.get(1).should.be.rejectedWith(/Cache key must be a string/)
                fakeClient.hGet.called.should.be.false()
            })

            it('round-trips strings, numbers, arrays', async function () {
                fakeClient.hGet.resolves(JSON.stringify('hello'))
                ;(await cache.get('k')).should.equal('hello')

                fakeClient.hGet.resolves(JSON.stringify(42))
                ;(await cache.get('k')).should.equal(42)

                fakeClient.hGet.resolves(JSON.stringify([1, 'two', { three: 3 }]))
                ;(await cache.get('k')).should.deepEqual([1, 'two', { three: 3 }])
            })

            it('round-trips falsy values', async function () {
                fakeClient.hGet.resolves(JSON.stringify(0))
                ;(await cache.get('k')).should.equal(0)

                fakeClient.hGet.resolves(JSON.stringify(false))
                ;(await cache.get('k')).should.equal(false)

                fakeClient.hGet.resolves(JSON.stringify(''))
                ;(await cache.get('k')).should.equal('')
            })

            it('does not refresh the TTL when updateAgeOnGet is not set', async function () {
                const ttlCache = redisCache.createCache('ttlonly', { ttl: 5000 })
                fakeClient.hGet.resolves(JSON.stringify('v'))
                await ttlCache.get('k')
                fakeClient.hpExpire.called.should.be.false()
            })
        })

        describe('get with updateAgeOnGet', function () {
            let agedCache

            beforeEach(function () {
                agedCache = redisCache.createCache('aged', { ttl: 5000, updateAgeOnGet: true })
            })

            it('uses hGetEx to get and refresh in one call when available', async function () {
                fakeClient.hGetEx = sinon.stub().resolves([JSON.stringify('v')])
                const val = await agedCache.get('k')
                val.should.equal('v')
                fakeClient.hGetEx.calledOnceWith('aged', 'k', { expiration: { type: 'PX', value: 5000 } }).should.be.true()
                fakeClient.hGet.called.should.be.false()
                fakeClient.hpExpire.called.should.be.false()
            })

            it('returns undefined via hGetEx when the key is missing', async function () {
                fakeClient.hGetEx = sinon.stub().resolves([null])
                should(await agedCache.get('missing')).be.undefined()
            })

            it('falls back to hGet + hpExpire when the client has no hGetEx', async function () {
                fakeClient.hGet.resolves(JSON.stringify('v'))
                const val = await agedCache.get('k')
                val.should.equal('v')
                fakeClient.hGet.calledOnceWith('aged', 'k').should.be.true()
                fakeClient.hpExpire.calledOnce.should.be.true()
            })

            it('does not call hpExpire in the fallback when the key is missing', async function () {
                fakeClient.hGet.resolves(null)
                should(await agedCache.get('missing')).be.undefined()
                fakeClient.hpExpire.called.should.be.false()
            })

            it('falls back permanently when the server rejects HGETEX as an unknown command', async function () {
                fakeClient.hGetEx = sinon.stub().rejects(new Error("ERR unknown command 'HGETEX'"))
                fakeClient.hGet.resolves(JSON.stringify('v'))

                ;(await agedCache.get('k')).should.equal('v')
                fakeClient.hGetEx.calledOnce.should.be.true()
                fakeClient.hGet.calledOnce.should.be.true()
                fakeClient.hpExpire.calledOnce.should.be.true()

                // second get skips hGetEx entirely
                ;(await agedCache.get('k')).should.equal('v')
                fakeClient.hGetEx.calledOnce.should.be.true()
                fakeClient.hGet.calledTwice.should.be.true()
            })

            it('propagates hGetEx errors that are not unknown-command', async function () {
                fakeClient.hGetEx = sinon.stub().rejects(new Error('connection lost'))
                await agedCache.get('k').should.be.rejectedWith(/connection lost/)
                fakeClient.hGet.called.should.be.false()
            })

            it('does not refresh when the cache has no ttl', async function () {
                const noTtlCache = redisCache.createCache('agedNoTtl', { updateAgeOnGet: true })
                fakeClient.hGetEx = sinon.stub()
                fakeClient.hGet.resolves(JSON.stringify('v'))
                ;(await noTtlCache.get('k')).should.equal('v')
                fakeClient.hGetEx.called.should.be.false()
                fakeClient.hpExpire.called.should.be.false()
            })
        })

        describe('scan', function () {
            it('passes the pattern to hScan and returns the matching fields', async function () {
                fakeClient.hScan.resolves({
                    cursor: '0',
                    entries: [
                        { field: 'response:aaa', value: JSON.stringify(1) },
                        { field: 'response:bbb', value: JSON.stringify(2) }
                    ]
                })
                const keys = await cache.scan('response:*')
                keys.should.deepEqual(['response:aaa', 'response:bbb'])
                fakeClient.hScan.calledOnceWith('mycache', '0', { MATCH: 'response:*', COUNT: 100 }).should.be.true()
            })

            it('iterates the cursor until it returns to 0 and dedupes fields', async function () {
                fakeClient.hScan.onFirstCall().resolves({
                    cursor: '17',
                    entries: [{ field: 'a', value: '1' }, { field: 'b', value: '2' }]
                })
                fakeClient.hScan.onSecondCall().resolves({
                    cursor: '0',
                    entries: [{ field: 'b', value: '2' }, { field: 'c', value: '3' }]
                })
                const keys = await cache.scan('*')
                keys.should.deepEqual(['a', 'b', 'c'])
                fakeClient.hScan.calledTwice.should.be.true()
                fakeClient.hScan.secondCall.args[1].should.equal('17')
            })

            it('returns an empty array when nothing matches', async function () {
                fakeClient.hScan.resolves({ cursor: '0', entries: [] })
                ;(await cache.scan('nomatch:*')).should.deepEqual([])
            })

            it('rejects a non-string pattern', async function () {
                await cache.scan(1).should.be.rejectedWith(/Cache scan pattern must be a string/)
                fakeClient.hScan.called.should.be.false()
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

            it('rejects a non-string key', async function () {
                await cache.set(1, 'v').should.be.rejectedWith(/Cache key must be a string/)
                fakeClient.hSet.called.should.be.false()
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

            it('rejects a non-string key', async function () {
                await cache.del(1).should.be.rejectedWith(/Cache key must be a string/)
                fakeClient.hDel.called.should.be.false()
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
