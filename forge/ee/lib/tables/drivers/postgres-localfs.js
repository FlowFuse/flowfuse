const { generatePassword } = require('../../../../lib/userTeam')

const libPg = require('./lib/pg.js')

module.exports = {
    init: async function (app, options) {
        this._app = app
        this._options = options || {}
        if (!options.database) {
            throw new Error('Postgres LocalFS driver requires database options to be provided')
        }
        this._adminClient = libPg.newClient(options.database || {})
        this._adminClient.on('error', (err) => {
            this._app.log.error(`Postgres LocalFS driver error: ${err.toString()}`)
        })
        try {
            await this._adminClient.connect()
        } catch (err) {
            app.log.error(`Failed to connect to Postgres: ${err.toString()}`)
        }
        app.log.info('Postgres LocalFS driver initialized')
    },
    shutdown: async function () {
        try {
            this._app.log.info('Shutting down Postgres LocalFS driver')
            await this._adminClient.end()
        } catch (err) {
            this._app.log.debug(`Error shutting down Postgres LocalFS driver: ${err.toString()}`)
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
        const res = await this._adminClient.query('SELECT datname FROM pg_database WHERE datistemplate = false AND datname = $1', [team.hashid])
        if (res.rows.length > 0) {
            throw new Error('Database already exists')
        } else {
            const escapedDatabaseName = libPg.pg.escapeIdentifier(team.hashid)
            await this._adminClient.query(`CREATE DATABASE ${escapedDatabaseName}`)
            await this._adminClient.query(`REVOKE connect ON DATABASE ${escapedDatabaseName} FROM PUBLIC;`)
            const teamClient = libPg.newClient({ ...this._options.database, database: team.hashid })
            const password = generatePassword()
            try {
                await teamClient.connect()
                // Escape identifiers for role and database names
                const escapedRoleName = libPg.pg.escapeIdentifier(`${team.hashid}-role`)
                const escapedUserName = libPg.pg.escapeIdentifier(team.hashid)
                // Escape the password literal for direct inclusion in DDL
                const escapedPassword = libPg.pg.escapeLiteral(password)
                // Create everything needed for the team
                await teamClient.query(`CREATE ROLE ${escapedRoleName} WITH LOGIN`)
                await teamClient.query(`GRANT CONNECT ON DATABASE ${escapedDatabaseName} TO ${escapedRoleName}`)
                await teamClient.query(`GRANT ALL PRIVILEGES ON DATABASE ${escapedDatabaseName} TO ${escapedRoleName}`)
                await teamClient.query(`GRANT CREATE ON SCHEMA public TO ${escapedRoleName}`)
                await teamClient.query(`GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ${escapedRoleName}`)
                await teamClient.query(`GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ${escapedRoleName}`)
                await teamClient.query(`CREATE USER ${escapedUserName} WITH PASSWORD ${escapedPassword}`)
                await teamClient.query(`GRANT ${escapedRoleName} TO ${escapedUserName}`)
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
            const res = await this._adminClient.query('SELECT datname FROM pg_database WHERE datistemplate = false AND datname = $1', [team.hashid])
            if (res.rows.length === 1) {
                try {
                    await this._adminClient.query(`DROP DATABASE IF EXISTS ${libPg.pg.escapeIdentifier(team.hashid)}`)
                    await this._adminClient.query(`DROP USER IF EXISTS ${libPg.pg.escapeIdentifier(team.hashid)}`)
                    await this._adminClient.query(`DROP ROLE IF EXISTS ${libPg.pg.escapeIdentifier(team.hashid + '-role')}`)
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
    getTables: async function (team, database, paginationOptions) {
        // SELECT * FROM pg_catalog.pg_tables;
        const databaseExists = await this._app.db.models.Table.byId(team.id, database)
        if (!databaseExists || databaseExists.TeamId !== team.id) {
            throw new Error(`Database ${database} for team ${team.hashid} does not exist`)
        }
        try {
            const teamClient = libPg.newClient({ ...this._options.database, database: team.hashid })
            try {
                await teamClient.connect()
                const res = await teamClient.query('SELECT "tablename" FROM "pg_catalog"."pg_tables" WHERE "schemaname" != \'pg_catalog\' AND "schemaname" != \'information_schema\'')
                if (res.rows && res.rows.length > 0) {
                    const tables = res.rows.map(row => {
                        return {
                            name: row.tablename,
                            schema: row.schemaname
                        }
                    })
                    return {
                        count: tables.length,
                        tables,
                        meta: {}
                    }
                } else {
                    return {
                        count: 0,
                        tables: [],
                        meta: {}
                    }
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
            const teamClient = libPg.newClient({ ...this._options.database, database: team.hashid })
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
    getTableData: async function (team, database, table, pagination) {
        const rows = Math.min(parseInt(pagination.limit) || 10, 10)
        const databaseExists = await this._app.db.models.Table.byId(team.id, database)
        if (!databaseExists || databaseExists.TeamId !== team.id) {
            throw new Error(`Database ${database} for team ${team.hashid} does not exist`)
        }
        try {
            const teamClient = libPg.newClient({ ...this._options.database, database: team.hashid })
            try {
                await teamClient.connect()
                const escapedTable = libPg.pg.escapeIdentifier(table)
                const query = `SELECT * FROM ${escapedTable} LIMIT $1`
                const res = await teamClient.query(query, [rows || 10])
                if (res.rows && res.rows.length > 0) {
                    return {
                        count: res.rows.length,
                        rows: res.rows,
                        meta: {}
                    }
                } else {
                    return {
                        count: 0,
                        rows: [],
                        meta: {}
                    }
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
            const teamClient = libPg.newClient(options)
            try {
                await teamClient.connect()
                let query = `CREATE TABLE IF NOT EXISTS ${libPg.pg.escapeIdentifier(tableName)} (\n`
                for (const [i, col] of columns.entries()) {
                    if (col.name.length === 0 || col.type.length === 0) {
                        continue
                    }
                    let column = `${libPg.pg.escapeIdentifier(col.name)} `
                    if (['bigint', 'bigserial', 'boolean', 'date', 'timestamptz', 'real', 'double precision', 'text'].includes(col.type)) {
                        column += `${col.type} `
                    } else {
                        throw new Error('Unsupported column type')
                    }
                    column += `${col.nullable ? '' : 'NOT NULL'} `
                    if (col.default) {
                        if (typeof col.default === 'string' && col.type === 'text') {
                            column += `DEFAULT ${libPg.pg.escapeLiteral(col.default)}`
                        } else if (col.type === 'bigint') {
                            column += `DEFAULT ${parseInt(col.default)}`
                        } else if (['real', 'double precision'].includes(col.type)) {
                            column += `DEFAULT ${parseFloat(column.default)}`
                        } else if (col.type === 'boolean') {
                            column += `DEFAULT ${column.default === 'true'}`
                        }
                    }
                    if (i + 1 !== columns.length) {
                        query += column + ',\n'
                    } else {
                        query += column + '\n'
                    }
                }
                if (query.endsWith(' ,\n')) {
                    query = query.replace(/ ,\n$/, '\n')
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
            const teamClient = libPg.newClient(options)
            try {
                await teamClient.connect()
                await teamClient.query(`DROP TABLE ${libPg.pg.escapeIdentifier(tableName)}`)
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
