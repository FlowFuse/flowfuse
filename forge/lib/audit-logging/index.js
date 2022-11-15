const formatters = require('./formatters')
const user = require('./user')
const project = require('./project')
const team = require('./team')
const platform = require('./platform')

module.exports = {
    formatters,
    getUserLogger: user.getLoggers,
    getProjectLogger: project.getLoggers,
    getTeamLogger: team.getLoggers,
    getPlatformLogger: platform.getLoggers
}
