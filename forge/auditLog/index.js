const fp = require('fastify-plugin')

const alerts = require('./alerts')
const application = require('./application')
const formatters = require('./formatters')
const platform = require('./platform')
const project = require('./project')
const team = require('./team')
const user = require('./user')

module.exports = fp(async function (app, _opts, next) {
    const loggers = {
        User: user.getLoggers(app),
        Application: application.getLoggers(app),
        Project: project.getLoggers(app),
        Team: team.getLoggers(app),
        Platform: platform.getLoggers(app),
        alerts: alerts.init(app),
        formatters
    }
    app.decorate('auditLog', loggers)

    next()
}, {
    name: 'app.auditLog'
})
