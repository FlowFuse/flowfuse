const fp = require('fastify-plugin')

module.exports = fp(async function (app, opts, done) {
    if (app.config.billing) {
        app.decorate('billing', require('./billing').init(app))
    }
    require('./projectComms').init(app)
    done()
})
