const fp = require('fastify-plugin')

/**
 * Loads the FlowForge EE components
 */
module.exports = fp(async function (app, opts, next) {
    // Load ee only if enabled in the license
    if (app.license.get('ee')) {
        app.log.info('Loading EE Features')
        require('./db/index.js').init(app)
        await app.register(require('./routes'), { prefix: '/ee' })
        await app.register(require('./lib'))
    }
    next()
})
