const { generatePassword } = require('../../../../lib/userTeam')
const databases = {}

module.exports = {
    init: async function (app, options) {
        this._app = app
    },
    shutdown: async function (app) {},
    getDatabases: async function (team) {
        const tables = await this._app.db.models.Table.byTeamId(team.id)
        return tables
    },
    getDatabase: async function (team, databaseId) {
        const table = await this._app.db.models.Table.byId(team.id, databaseId)
        return table
    },
    createDatabase: async function (team, name) {
        // console.log('Creating database for team', team.hashid, 'with name', name)
        if (databases[team.hashid]) {
            throw new Error('Database already exists')
        }
        databases[team.hashid] = {
            TeamId: team.id,
            name,
            credentials: {
                host: 'localhost',
                port: 5432,
                database: team.hashid,
                user: 'postgres',
                password: generatePassword(16),
                ssl: false
            },
            meta: {}
        }
        const table = await this._app.db.models.Table.create(databases[team.hashid])
        return table
    },
    destroyDatabase: async function (team, databaseId) {
        const db = await this._app.db.models.Table.byId(team.id, databaseId)
        if (!db) {
            throw new Error(`Database ${databaseId} for team ${team.hashid} does not exist`)
        }
        await db.destroy()
        delete databases[team.hashid]
    },
    getTables: async function (team, databaseId) {
        return [{ name: 'table1', schema: 'public' }, { name: 'table2', schema: 'public' }]
    },
    getTable: async function (team, databaseId, tableName) {
        return [
            { name: 'id', type: 'integer', nullable: false, default: null, maxLength: null, generated: false },
            { name: 'name', type: 'text', nullable: true, default: null, maxLength: 255, generated: false }
        ]
    },
    getTableData: async function (team, databaseId, table, rows) {
        return [
            { id: 1, name: 'Row 1' },
            { id: 2, name: 'Row 2' }
        ]
    },
    createTable: async function (team, databaseId, table) {},
    dropTable: async function (team, databaseId, tableName) {},
    createColumn: async function (team, database, table, column) {},
    removeColumn: async function (team, database, table, column) {}
}
