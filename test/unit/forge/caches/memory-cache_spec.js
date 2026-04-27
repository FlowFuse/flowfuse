const should = require('should') // eslint-disable-line
const setup = require('../routes/setup')

describe('Memory Cache', function () {
    let app
    before(async function () {
        app = await setup()
        app.caches.createCache('cache1')
    })

    after(async function () {
        await app.close()
    })

    it('create cache', async function () {
        const cache = app.caches.getCache('cache1')
        cache.should.have.property('set').which.is.a.Function()
        cache.should.have.property('get').which.is.a.Function()
        cache.should.have.property('del').which.is.a.Function()
        cache.should.have.property('keys').which.is.a.Function()
        cache.should.have.property('all').which.is.a.Function()
    })
    it('getCache creates with default options if it does not exist', function () {
        const cache = app.caches.getCache('autoDefault')
        cache.should.have.property('set').which.is.a.Function()
        cache.should.have.property('get').which.is.a.Function()
        // no bound supplied → memory driver defaults max to 1000
        cache.lru.max.should.equal(1000)
        // subsequent getCache returns the same instance
        app.caches.getCache('autoDefault').should.equal(cache)
    })

    it('getCache creates with specified options if it does not exist', function () {
        const cache = app.caches.getCache('autoTTL', { ttl: 500, max: 50 })
        cache.lru.ttl.should.equal(500)
        cache.lru.max.should.equal(50)
        // options on subsequent calls are ignored — the existing instance wins
        const second = app.caches.getCache('autoTTL', { ttl: 9999 })
        second.should.equal(cache)
        second.lru.ttl.should.equal(500)
    })
    it('set & get strings', async function () {
        const cache = app.caches.getCache('cache1')
        await cache.set('one', 'one')
        const one = await cache.get('one')
        one.should.equal('one')
    })
    it('set & get number', async function () {
        const cache = app.caches.getCache('cache1')
        await cache.set('one', 1)
        const one = await cache.get('one')
        one.should.equal(1)
    })
    it('set & get Object', async function () {
        const cache = app.caches.getCache('cache1')
        await cache.set('one', { one: 'one' })
        const one = await cache.get('one')
        should(one).is.Object()
        one.should.deepEqual({ one: 'one' })
    })
    it('set & get Array', async function () {
        const cache = app.caches.getCache('cache1')
        await cache.set('one', ['one', 2, { three: 3 }, ['one', 2, { three: 3 }]])
        const array = await cache.get('one')
        should(array).containDeep(['one', 2, { three: 3 }, ['one', 2, { three: 3 }]])
    })
    it('expires keys with ttl', async function () {
        app.caches.createCache('cache2', { ttl: 500 })
        const cache = app.caches.getCache('cache2')
        await cache.set('one', 'one')
        const one = await cache.get('one')
        one.should.equal('one')
        await new Promise(resolve => setTimeout(resolve, 600))
        const expired = await cache.get('one')
        should(expired).be.undefined()
    })
    it('keys', async function () {
        const cache = app.caches.getCache('cache1')
        await cache.set('one', 'one')
        await cache.set('two', 'two')
        await cache.set('three', 'three')
        await cache.set('four', 'four')

        const keys = await cache.keys()
        keys.should.containDeep(['one', 'two', 'three', 'four'])
    })
    it('all', async function () {
        const cache = app.caches.getCache('cache1')
        await cache.set('one', 'one')
        await cache.set('two', 'two')
        await cache.set('three', 'three')
        await cache.set('four', 'four')

        const all = await cache.all()
        all.should.deepEqual({ one: 'one', two: 'two', three: 'three', four: 'four' })
    })
    it('del', async function () {
        const cache = app.caches.getCache('cache1')
        await cache.set('one', 'one')
        await cache.set('two', 'two')
        await cache.set('three', 'three')
        await cache.set('four', 'four')

        let all = await cache.all()
        all.should.deepEqual({ one: 'one', two: 'two', three: 'three', four: 'four' })

        await cache.del('three')
        all = await cache.all()
        all.should.deepEqual({ one: 'one', two: 'two', four: 'four' })
    })
    it('close caches', async function () {
        // capture the live instances + confirm cache1 has data from prior tests
        const cache1Before = app.caches.getCache('cache1')
        const cache2Before = app.caches.getCache('cache2')
        cache1Before.set('k', 'v')
        cache2Before.set('k', 'v')
        ;(await cache1Before.keys()).length.should.be.aboveOrEqual(1)
        ;(await cache2Before.keys()).length.should.be.aboveOrEqual(1)

        await app.caches.closeCache()

        // closeCache should clear the underlying lru on the previous instances
        ;[...cache1Before.lru.keys()].should.deepEqual([])
        ;[...cache2Before.lru.keys()].should.deepEqual([])

        // and the registry is wiped — getCache auto creates fresh instances
        const cache1After = app.caches.getCache('cache1')
        const cache2After = app.caches.getCache('cache2')
        cache1After.should.not.equal(cache1Before)
        cache2After.should.not.equal(cache2Before)
        ;(await cache1After.keys()).should.deepEqual([])
        ;(await cache2After.keys()).should.deepEqual([])
    })
})
