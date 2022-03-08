const fp = require('fastify-plugin')

module.exports = fp(async function (app, opts, done) {
    app.decorate('billing', require('./billing').init(app))
    done()
})