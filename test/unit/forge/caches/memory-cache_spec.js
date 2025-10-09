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
        await cache.set('one', {one: 'one'})
        const one = await cache.get('one')
        one.should.deepEqual({one: 'one'})
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
})