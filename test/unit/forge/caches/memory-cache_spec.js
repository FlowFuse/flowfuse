const should = require('should') // eslint-disable-line
const setup = require('../routes/setup')

describe('Memory Cache', function () {
    let app
    before(async function () {
        app = await setup()
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
    it('close caches', async function (){
        await app.caches.closeCache()
    })
})
