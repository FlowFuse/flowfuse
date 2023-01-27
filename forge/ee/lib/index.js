const fp = require('fastify-plugin')

module.exports = fp(async function (app, opts, done) {
    if (app.config.billing) {
        app.decorate('billing', await require('./billing').init(app))
    }
    require('./projectComms').init(app)
    app.decorate('sso', await require('./sso').init(app))

    // Set the Team Library Feature Flag
    app.config.features.register('shared-library', true, true)

    done()
})
