/**
 * Routes releated to the EE forge api
 * @param {import('../../forge').ForgeApplication} app - forge application
 * @namespace api
 * @memberof forge.ee
 */
module.exports = async function (app) {
    app.addHook('preHandler', app.verifySession)
    if (app.config.billing) {
        await app.register(require('./billing'), { prefix: '/ee/billing', logLevel: app.config.logging.http })
    }
    await app.register(require('./sharedLibrary'), { logLevel: app.config.logging.http })
    await app.register(require('./pipeline'), { prefix: '/api/v1', logLevel: app.config.logging.http })
    await app.register(require('./deviceEditor'), { prefix: '/api/v1/devices/:deviceId/editor', logLevel: app.config.logging.http })

    await app.register(require('./ha'), { prefix: '/api/v1/projects/:projectId/ha', logLevel: app.config.logging.http })

    // Important: keep SSO last to avoid its error handling polluting other routes.
    await app.register(require('./sso'), { logLevel: app.config.logging.http })
}
