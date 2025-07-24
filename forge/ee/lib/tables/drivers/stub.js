const { generatePassword } = require('../../../../lib/userTeam')
const databases = {}
const tables = {}

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
    createTable: async function (team, databaseId, tableName, columns) {
        if (tables[tableName]) {
            throw new Error()
        }
        let query = `CREATE TABLE IF NOT EXISTS "${tableName}" (\n`
        for (const [i, col] of columns.entries()) {
            console.log(col)
            let column = `"${col.name}" `
            if (col.type === 'varchar') {
                column += `${col.type}(${col.maxLength}) `
            } else {
                column += `${col.type} `
            }
            column += `${col.nullable ? '': 'NOT NULL'} ` 
            if (col.default) {
                if (typeof col.default === 'string') {
                    column += `DEFAULT '${col.default}'`
                } else {
                    column += `DEFAULT ${col.default}`
                }
            }
            if (i + 1 !== columns.length) {
                query += column + ',\n'
            } else {
                query += column + '\n'
            }
        }
        query += ')'
        app.log.info(query)
        tables[tableName] = columns
        return columns
    },
    dropTable: async function (team, databaseId, tableName) {
        if (tables[tableName]) {
            delete tables[tableName]
        } else {
            throw new Error('table not found')
        }
    },
    createColumn: async function (team, database, table, column) {},
    removeColumn: async function (team, database, table, column) {}
}
