const user = require('./user')
const project = require('./project')
const team = require('./team')
const platform = require('./platform')
const formatters = require('./formatters')

const fp = require('fastify-plugin')

module.exports = fp(async function (app, _opts, next) {
    const loggers = {
        User: user.getLoggers(app),
        Project: project.getLoggers(app),
        Team: team.getLoggers(app),
        Platform: platform.getLoggers(app),
        formatters
    }
    app.decorate('auditLog', loggers)

    next()
})
