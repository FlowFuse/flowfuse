const fp = require('fastify-plugin')

/**
 * 
 */
module.exports = fp(async function (app, opts, next) {

    await require('./db/models').init(app)
    await require('./db/controllers').init(app)
    await app.register(require('./routes'), { prefix: '/ee/billing', logLevel: 'warn' })

    const billing = require('./functions.js').init(app)

    app.decorate('billing', billing)

    next()
})