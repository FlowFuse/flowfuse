const fp = require('fastify-plugin')

const application = require('./application')
const device = require('./device')
const formatters = require('./formatters')
const platform = require('./platform')
const project = require('./project')
const team = require('./team')
const user = require('./user')

module.exports = fp(async function (app, _opts) {
    const loggers = {
        User: user.getLoggers(app),
        Application: application.getLoggers(app),
        Project: project.getLoggers(app),
        Team: team.getLoggers(app),
        Platform: platform.getLoggers(app),
        Device: device.getLoggers(app),
        formatters
    }
    app.decorate('auditLog', loggers)
}, {
    name: 'app.auditLog'
})
