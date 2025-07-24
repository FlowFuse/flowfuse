const pg = require('pg')

const { generatePassword } = require('../../../../lib/userTeam')

let adminClient

module.exports = {
    init: async function (app, options) {
        this._app = app
        this._options = options || {}
        if (!options.database) {
            throw new Error('Postgres LocalFS driver requires database options to be provided')
        }
        adminClient = new pg.Client(options.database || {})
        adminClient.on('error', (err) => {
            this._app.log.error('Postgres LocalFS driver error:', err)
        })
        try {
            await adminClient.connect()
        } catch (err) {
            app.log.error('Failed to connect to Postgres:', err)
        }
        app.log.info('Postgres LocalFS driver initialized')
    },
    shutdown: async function () {
        try {
            this._app.log.info('Shutting down Postgres LocalFS driver')
            await adminClient.end()
        } catch (err) {
            this._app.log.debug('Error shutting down Postgres LocalFS driver:', err)
        }
    },
    getDatabases: async function (team) {
        const tables = await this._app.db.models.Table.byTeamId(team.id)
        if (tables && tables.length > 0) {
            return tables
        } else {
            return []
        }
    },
    getDatabase: async function (team, databaseId) {
        const table = await this._app.db.models.Table.byId(team.id, databaseId)
        if (table) {
            return table
        } else {
            throw new Error(`Database ${databaseId} for team ${team.hashid} does not exist`)
        }
    },
    createDatabase: async function (team, name) {
        const existing = await this._app.db.models.Table.byTeamId(team.id)
        // Will need removing when we support multiple databases per team
        if (existing && existing.length > 0) {
            throw new Error('Database already exists')
        }
        const res = await adminClient.query('SELECT datname FROM pg_database WHERE datistemplate = false AND datname = $1', [team.hashid])
        if (res.rows.length > 0) {
            throw new Error('Database already exists')
        } else {
            await adminClient.query(`CREATE DATABASE "${team.hashid}"`)
            await adminClient.query(`REVOKE connect ON DATABASE "${team.hashid}" FROM PUBLIC;`)
            const options = {
                host: this._options.database.host,
                port: this._options.database.port,
                ssl: this._options.database.ssl,
                database: team.hashid,
                user: this._options.database.user,
                password: this._options.database.password
            }
            const teamClient = new pg.Client(options)
            const password = generatePassword()
            try {
                await teamClient.connect()
                // need to generate a password for the team user
                await teamClient.query(`CREATE ROLE "${team.hashid}-role" WITH LOGIN`)
                await teamClient.query(`GRANT CONNECT ON DATABASE "${team.hashid}" TO "${team.hashid}-role"`)
                await teamClient.query(`GRANT ALL PRIVILEGES ON DATABASE "${team.hashid}" TO "${team.hashid}-role"`)
                await teamClient.query(`GRANT CREATE ON SCHEMA public TO "${team.hashid}-role"`)
                await teamClient.query(`GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO "${team.hashid}-role"`)
                await teamClient.query(`GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO "${team.hashid}-role"`)
                await teamClient.query(`CREATE USER "${team.hashid}" WITH PASSWORD '${password}'`)
                await teamClient.query(`GRANT "${team.hashid}-role" TO "${team.hashid}"`)
            } finally {
                await teamClient.end()
            }
            this._app.log.info(`Database created for team ${team.hashid}`)
            const credentials = {
                host: this._options.database.host,
                port: this._options.database.port,
                ssl: this._options.database.ssl,
                database: team.hashid,
                user: team.hashid,
                password
            }
            const table = await this._app.db.models.Table.create({
                name,
                TeamId: team.id,
                credentials
            })
            return table
        }
    },
    destroyDatabase: async function (team, databaseId) {
        const db = await this._app.db.models.Table.byId(team.id, databaseId)
        if (db) {
            const res = await adminClient.query('SELECT datname FROM pg_database WHERE datistemplate = false AND datname = $1', [team.hashid])
            if (res.rows.length === 1) {
                try {
                    await adminClient.query(`DROP DATABASE IF EXISTS "${team.hashid}"`)
                    await adminClient.query(`DROP USER IF EXISTS "${team.hashid}"`)
                    await adminClient.query(`DROP ROLE IF EXISTS "${team.hashid}-role"`)
                    await db.destroy()
                } catch (err) {
                    // console.log(err)
                }
            } else {
                throw new Error(`Database ${team.hashid} does not exist`)
            }
        } else {
            throw new Error(`Database ${team.hashid} does not exist`)
        }
    },
    getTables: async function (team, database) {
        // SELECT * FROM pg_catalog.pg_tables;
        const databaseExists = await this._app.db.models.Table.byId(team.id, database)
        if (!databaseExists || databaseExists.TeamId !== team.id) {
            throw new Error(`Database ${database} for team ${team.hashid} does not exist`)
        }
        try {
            const options = {
                host: this._options.database.host,
                port: this._options.database.port,
                ssl: this._options.database.ssl,
                database: team.hashid,
                user: this._options.database.user,
                password: this._options.database.password
            }
            const teamClient = new pg.Client(options)
            try {
                await teamClient.connect()
                const res = await teamClient.query('SELECT "tablename" FROM "pg_catalog"."pg_tables" WHERE "schemaname" != \'pg_catalog\' AND "schemaname" != \'information_schema\'')
                if (res.rows && res.rows.length > 0) {
                    return res.rows.map(row => {
                        return {
                            name: row.tablename,
                            schema: row.schemaname
                        }
                    })
                } else {
                    return []
                }
            } finally {
                teamClient.end()
            }
        } catch (err) {
            console.error('Error retrieving tables:', err)
            throw new Error(`Failed to retrieve tables for team ${team.hashid}: ${err.message}`)
        }
    },
    getTable: async function (team, database, table) {
        // SELECT column_name, data_type, is_nullable, column_default
        // FROM information_schema.columns
        // WHERE table_name = 'your_table_name';
        const databaseExists = await this._app.db.models.Table.byId(team.id, database)
        if (!databaseExists || databaseExists.TeamId !== team.id) {
            throw new Error(`Database ${database} for team ${team.hashid} does not exist`)
        }
        try {
            const options = {
                host: this._options.database.host,
                port: this._options.database.port,
                ssl: this._options.database.ssl,
                database: team.hashid,
                user: this._options.database.user,
                password: this._options.database.password
            }
            const teamClient = new pg.Client(options)
            try {
                await teamClient.connect()
                const res = await teamClient.query('SELECT column_name, udt_name, is_nullable, column_default, character_maximum_length, is_generated FROM information_schema.columns WHERE table_name = $1', [table])
                if (res.rows && res.rows.length > 0) {
                    return res.rows.map(row => {
                        const col = {
                            name: row.column_name,
                            type: row.udt_name,
                            nullable: row.is_nullable === 'YES',
                            default: row.column_default,
                            generated: row.is_generated === 'ALWAYS'
                        }
                        if (row.character_maximum_length) {
                            col.maxLength = row.character_maximum_length
                        }
                        return col
                    })
                } else {
                    return null
                }
            } finally {
                teamClient.end()
            }
        } catch (err) {
            console.error('Error retrieving table:', err)
            throw new Error(`Failed to retrieve table ${table} for team ${team.hashid}: ${err.message}`)
        }
    },
    getTableData: async function (team, database, table, rows) {
        const databaseExists = await this._app.db.models.Table.byId(team.id, database)
        if (!databaseExists || databaseExists.TeamId !== team.id) {
            throw new Error(`Database ${database} for team ${team.hashid} does not exist`)
        }
        try {
            const options = {
                host: this._options.database.host,
                port: this._options.database.port,
                ssl: this._options.database.ssl,
                database: team.hashid,
                user: this._options.database.user,
                password: this._options.database.password
            }
            const teamClient = new pg.Client(options)
            try {
                await teamClient.connect()
                const query = `SELECT * FROM "${table}" LIMIT $1`
                const res = await teamClient.query(query, [rows || 10])
                if (res.rows && res.rows.length > 0) {
                    return res.rows
                } else {
                    return []
                }
            } finally {
                teamClient.end()
            }
        } catch (err) {
            console.error('Error retrieving table:', err)
            throw new Error(`Failed to retrieve table ${table} for team ${team.hashid}: ${err.message}`)
        }
    },
    createTable: async function (team, databaseId, tableName, columns) {
        const databaseExists = await this._app.db.models.Table.byId(team.id, databaseId)
        if (!databaseExists || databaseExists.TeamId !== team.id) {
            throw new Error(`Database ${databaseId} for team ${team.hashid} does not exist`)
        }
        try {
            const options = databaseExists.credentials
            const teamClient = new pg.Client(options)
            try {
                await teamClient.connect()
                let query = `CREATE TABLE IF NOT EXISTS "${tableName}" (\n`
                for (const [i, col] of columns.entries()) {
                    let column = `"${col.name}" `
                    if (col.type === 'varchar') {
                        column += `${col.type}(${col.maxLength}) `
                    } else {
                        column += `${col.type} `
                    }
                    column += `${col.nullable ? '' : 'NOT NULL'} `
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
                await teamClient.query(query)
            } finally {
                teamClient.end()
            }
        } catch (err) {
            console.error('Error retrieving table:', err)
            throw new Error(`Failed to create table ${tableName} for team ${team.hashid}: ${err.message}`)
        }
    },
    dropTable: async function (team, databaseId, tableName) {
        const databaseExists = await this._app.db.models.Table.byId(team.id, databaseId)
        if (!databaseExists || databaseExists.TeamId !== team.id) {
            throw new Error(`Database ${databaseId} for team ${team.hashid} does not exist`)
        }
        try {
            const options = databaseExists.credentials
            const teamClient = new pg.Client(options)
            try {
                await teamClient.connect()
                teamClient.query(`DROP TABLE ${tableName}`)
            } finally {
                teamClient.end()
            }
        } catch (err) {
            console.error('Error retrieving table:', err)
            throw new Error(`Failed to create table ${tableName} for team ${team.hashid}: ${err.message}`)
        }
    },
    createColumn: async function (team, database, table, column) {},
    removeColumn: async function (team, database, table, column) {}
}
