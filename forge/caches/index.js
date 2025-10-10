/**
 * The a pluggable object cache
 *
 * @namespace cache
 * @memberof forge
 */

/**
 * @typedef {Object} forge.Status
 * @property {string} status
 */
const fp = require('fastify-plugin')

const CACHE_DRIVERS = {
    memory: './memory-cache.js',
    redis: './redis-cache.js'
}

module.exports = fp(async function (app, _opts) {
    const cacheType = app.config.cache?.driver || 'memory'
    const cacheModule = CACHE_DRIVERS[cacheType]
    try {
        const driver = require(cacheModule)
        await driver.initCache(app.config.cache?.options || {})
        app.decorate('caches', driver)
        app.log.info(`Cache driver: ${cacheType}`)
        app.addHook('onClose', async (_) => {
            app.log.info('Driver shutdown')
            await driver.closeCache()
        })
    } catch (err) {
        app.log.error(`Failed to load the cache driver: ${cacheType}`)
        throw err
    }
}, { name: 'app.caches' })
