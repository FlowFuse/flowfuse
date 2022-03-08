const fp = require('fastify-plugin')

/**
 * Loads the FlowForge EE components
 */
module.exports = fp(async function (app, opts, next) {
    // Load billing only if enabled in the license
    if (app.license.get('billing')) {
        app.log.info('Loading Billing')
        const billing = require('./billing')
        await app.register(billing)
        app.get('/ee/features', {
            logLevel: 'warn'
        }, async (request, response) => {
            response.send({
                billing: true
            })
        })
    }
    next()
})
