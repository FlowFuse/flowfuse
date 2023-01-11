const fp = require('fastify-plugin')

/**
 * Loads the FlowForge EE components
 */
module.exports = fp(async function (app, opts, next) {
    // Load ee only if enabled in the license
    if (app.license.active()) {
        app.log.info('Loading EE Features')
        await require('./db/index.js').init(app)
        await app.register(require('./routes'), { logLevel: app.config.logging.http })
        await app.register(require('./lib'))
    }
    next()
})
