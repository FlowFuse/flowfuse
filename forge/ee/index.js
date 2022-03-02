const fp = require('fastify-plugin')

/**
 * 
 */
module.exports = fp(async function(app, opts, next) {

    //load billing only if enabled in the license
    if (app.license.get('billing')) {
        app.log.info("Loading Billing")
        const billing = require('./billing')
        await app.register(billing)
    }

    next()
})