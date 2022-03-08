const fp = require('fastify-plugin')

/**
 * Loads the FlowForge EE components
 */
module.exports = fp(async function (app, opts, next) {
    // Load billing only if enabled in the license
    if (app.license.get('ee')) {
        app.log.info('Loading EE Features')
        require('./db/index.js').init(app)
        if (app.config.billing) {
            app.log.info('Loading Billing')
            app.register(require('./routes/billing'), { prefix: '/ee/billing', logLevel: 'warn'})
            app.decorate('billing', require('./lib/billing').init(app))
        }

        // const billing = require('./billing')
        // await app.register(billing)
        app.get('/ee/features', {
            logLevel: 'warn'
        }, async (request, response) => {
            response.send({
                billing: app.config.billing ? true: false
            })
        })
    }
    next()
})
