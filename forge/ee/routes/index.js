/**
 * Routes releated to the EE forge api
 *
 * @namespace api
 * @memberof forge.ee
 */
module.exports = async function (app) {
    // app.addHook('preHandler', app.verifyTokenOrSession)
    await app.register(require('./ee'), { logLevel: 'warn' })
    if (app.config.billing) {
        await app.register(require('./billing'), { prefix: '/billing', logLevel: 'warn' })
    }
}
