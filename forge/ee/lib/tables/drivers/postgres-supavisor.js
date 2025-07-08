const pg = require('pg')

const { generatePassword } = require('../../../../lib/userTeam')

module.exports = {
    init: async function (app, options) {
        this._app = app
        this._options = options
    },
    shutdown: async function (app) {},
    getDatabases: async function (team) {},
    getDatabase: async function (team, database) {}
}
