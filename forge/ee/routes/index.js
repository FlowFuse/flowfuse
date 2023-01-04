/**
 * Routes releated to the EE forge api
 *
 * @namespace api
 * @memberof forge.ee
 */
module.exports = async function (app) {
    app.addHook('preHandler', app.verifySession)
    if (app.config.billing) {
        await app.register(require('./billing'), { prefix: '/billing', logLevel: app.config.logging.http })
    }
    await app.register(require('./sso'), { logLevel: app.config.logging.http })
}
