const { generatePassword } = require('../../../../lib/userTeam')
const databases = {}

module.exports = {
    init: async function (app, options) {
        this._app = app
    },
    shutdown: async function (app) {},
    getDatabases: async function (team) {
        if (!databases[team.hashid]) {
            throw new Error("Database not found")
        }
        return [databases[team.hashid]]
    },
    getDatabase: async function (team, databaseId) {
        if (!databases[team.hashid]) {
            throw new Error("Database not found")
        }
        return databases[team.hashid]
    },
    createDatabase: async function (team, name) {
        if (databases[team.hashid]) {
            throw new Error("Database already exists")
        }
        databases[team.hashid] = {
            TeamId: team.hashid,
            name,
            credentials: {
                host: "localhost",
                port: 5432,
                database: team.hashid,
                user: "postgres",
                password: generatePassword(16),
                ssl: false
            }
        };
        return databases[team.hashid]
    },
    destroyDatabase: async function (team, databaseId) {
        if (!databases[team.hashid]) {
            throw new Error("Database not found")
        }
        delete databases[team.hashid]
    },
    getTables: async function (team, databaseId) {
        return ['table1', 'table2']
    },
    getTable: async function (team, databaseId, tableName) {
        return [
            {name: 'id', type: 'integer', nullable: false, default: null, maxLength: null, generated: false},
            {name: 'name', type: 'text', nullable: true, default: null, maxLength: 255, generated: false}
        ]
    },
    getTableData: async function (team, databaseId, table, rows) {
        return [
            {id: 1, name: 'Row 1'},
            {id: 2, name: 'Row 2'}
        ]
    },
    createTable: async function (team, databaseId, table) {},
    dropTable: async function (team, databaseId, tableName) {},
    createColumn: async function (team, database, table, column) {},
    removeColumn: async function (team, database, table, column) {}
}