const axios = require('axios')

const { generatePassword } = require('../../../../lib/userTeam')

const libPg = require('./lib/pg.js')

module.exports = {
    init: async function (app, options) {
        this._app = app
        this._options = options

        if (!options.backend) {
            throw new Error('Postgres Supavisor driver requires backend options to be provided')
        }
        if (!options.supavisor) {
            throw new Error('Postgres Supavisor driver requires supavisor options to be provided')
        }
        this._adminClient = libPg.newClient(options.backend || {})
        this._adminClient.on('error', (err) => {
            this._app.log.error(`Postgres Supavisor driver error: ${err.toString()}`)
        })
        try {
            await this._adminClient.connect()
        } catch (err) {
            app.log.error(`Failed to connect to Postgres: ${err.toString()}`)
        }
        app.log.info('Postgres Supavisor driver initialized')
    },
    shutdown: async function (app) {
        try {
            this._app.log.info('Shutting down Postgres Supavisor driver')
            await this._adminClient.end()
        } catch (err) {
            this._app.log.debug(`Error shutting down Postgres Supavisor driver: ${err.toString()}`)
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
            const password = generatePassword(16)
            try {
                const escapedDatabaseName = libPg.pg.escapeIdentifier(team.hashid)
                await this._adminClient.query(`CREATE DATABASE ${escapedDatabaseName}`)
                await this._adminClient.query(`REVOKE connect ON DATABASE ${escapedDatabaseName} FROM PUBLIC;`)
                await this._adminClient.query(`ALTER DATABASE ${escapedDatabaseName} SET statement_timeout='30s'`)
                const teamClient = libPg.newClient({ ...this._options.backend, database: team.hashid })
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

                const tenant = {
                    tenant: {
                        db_host: this._options.backend.supavisorHost ? this._options.backend.supavisorHost : this._options.backend.host,
                        db_port: this._options.backend.port,
                        db_database: team.hashid,
                        external_id: team.hashid,
                        ip_version: 'auto',
                        upstream_ssl: !!this._options.backend.ssl,
                        upstream_verify: this._options.backend.ssl ? 'none' : undefined,
                        require_user: true,
                        auth_query: 'SELECT rolname, rolpassword FROM pg_authid WHERE rolname=$1;',
                        // sni_hostname: `${team.slug}.${this._options.supavisor.domain}`,
                        users: [
                            {
                                db_user: team.hashid,
                                db_password: password,
                                mode_type: 'transaction',
                                is_manager: true,
                                pool_size: 10,
                                max_clients: 10
                            }
                        ]
                    }
                }

                this._app.log.debug(`FF Tables creating tenant:\n${JSON.stringify(tenant, null, 2)}`)

                const response = await axios.put(`${this._options.supavisor.url}/api/tenants/${team.hashid}`, tenant, {
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${this._options.supavisor.token}`
                    }
                })
                if (response.status === 201) {
                    this._app.log.info(`Database created for team ${team.hashid}`)
                    const credentials = {
                        host: `${this._options.supavisor.domain}`,
                        port: this._options.supavisor.port,
                        ssl: this._options.supavisor.ssl,
                        database: team.hashid,
                        user: `${team.hashid}.${team.hashid}`,
                        password
                    }
                    const meta = {
                        host: this._options.backend.host,
                        port: this._options.backend.port,
                        ssl: this._options.backend.ssl,
                        database: this._options.backend.database
                    }
                    const table = await this._app.db.models.Table.create({
                        TeamId: team.id,
                        name,
                        credentials,
                        meta
                    })
                    return table
                } else {
                    this._app.log.error(`Failed to create database\n${JSON.stringify(response, null, 2)}\n${JSON.stringify(tenant, null, 2)}`)
                    throw new Error(`Failed to create database for team ${team.hashid}: ${response.statusText}`)
                }
            } catch (err) {
                // console.log(err)
                this._app.log.error(`Failed to create database\n${this._options.supavisor.url}/api/tenants/${team.hashid}\n${err.toString()}`)
            }
        }
    },
    destroyDatabase: async function (team, databaseId) {
        const db = await this._app.db.models.Table.byId(team.id, databaseId)
        if (!db) {
            throw new Error(`Database ${databaseId} for team ${team.hashid} does not exist`)
        }
        try {
            await axios.delete(`${this._options.supavisor.url}/api/tenants/${team.hashid}`, {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${this._options.supavisor.token}`
                }
            })
        } catch (err) {
            // console.log(err)
        }
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
    },
    getTables: async function (team, databaseId, paginationOptions) {
        // SELECT * FROM pg_catalog.pg_tables;
        const databaseExists = await this._app.db.models.Table.byId(team.id, databaseId)
        if (!databaseExists || databaseExists.TeamId !== team.id) {
            throw new Error(`Database ${databaseId} for team ${team.hashid} does not exist`)
        }
        try {
            const teamClient = libPg.newClient({ ...this._options.backend, database: team.hashid })
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
    getTable: async function (team, databaseId, tableName) {
        // SELECT column_name, data_type, is_nullable, column_default
        // FROM information_schema.columns
        // WHERE table_name = 'your_table_name';
        const databaseExists = await this._app.db.models.Table.byId(team.id, databaseId)
        if (!databaseExists || databaseExists.TeamId !== team.id) {
            throw new Error(`Database ${databaseId} for team ${team.hashid} does not exist`)
        }
        try {
            const teamClient = libPg.newClient({ ...this._options.backend, database: team.hashid })
            try {
                await teamClient.connect()
                const res = await teamClient.query('SELECT column_name, udt_name, is_nullable, column_default, character_maximum_length, is_generated FROM information_schema.columns WHERE table_name = $1', [tableName])
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
            throw new Error(`Failed to retrieve table ${tableName} for team ${team.hashid}: ${err.message}`)
        }
    },
    getTableData: async function (team, database, table, pagination) {
        const rows = Math.min(parseInt(pagination.limit) || 10, 10)
        const databaseExists = await this._app.db.models.Table.byId(team.id, database)
        if (!databaseExists || databaseExists.TeamId !== team.id) {
            throw new Error(`Database ${database} for team ${team.hashid} does not exist`)
        }
        try {
            const teamClient = libPg.newClient({ ...this._options.backend, database: team.hashid })
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
    /**
     * Query data in tables
     * IMPORTANT: this method is primarily intended for internal usage (like getting AI schema hints)
     * @param {Object} team - The team object
     * @param {String} databaseId - The database ID
     * @param {String} queryText - The SQL query to execute
     * @param {Array} params - The parameters for the query
     * @returns {String} - The result(s) of the query
     * @throws {Error} - If the database does not exist
     */
    query: async function (team, databaseId, queryText, params = undefined) {
        const databaseExists = await this._app.db.models.Table.byId(team.id, databaseId)
        if (!databaseExists || databaseExists.TeamId !== team.id) {
            throw new Error(`Database ${databaseId} for team ${team.hashid} does not exist`)
        }
        const teamClient = libPg.newClient({ ...this._options.backend, database: team.hashid })
        try {
            await teamClient.connect()
            const result = await teamClient.query(queryText, params)
            return result
        } catch (error) {
            console.error('Error running query:', error)
            throw error
        } finally {
            await teamClient.end()
        }
    },
    createTable: async function (team, databaseId, tableName, columns) {
        const databaseExists = await this._app.db.models.Table.byId(team.id, databaseId)
        if (!databaseExists || databaseExists.TeamId !== team.id) {
            throw new Error(`Database ${databaseId} for team ${team.hashid} does not exist`)
        }
        try {
            const options = {
                host: this._options.backend.host,
                port: this._options.backend.port,
                ssl: this._options.backend.ssl,
                database: team.hashid,
                user: team.hashid,
                password: databaseExists.credentials.password
            }
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
                        } else if (col.type === 'timestamptz') {
                            column += 'DEFAULT NOW()'
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
            console.error(err)
            throw new Error(`Failed to create table ${tableName} for team ${team.hashid}: ${err.message}`)
        }
    },
    dropTable: async function (team, databaseId, tableName) {
        const databaseExists = await this._app.db.models.Table.byId(team.id, databaseId)
        if (!databaseExists || databaseExists.TeamId !== team.id) {
            throw new Error(`Database ${databaseId} for team ${team.hashid} does not exist`)
        }
        try {
            const options = {
                host: this._options.backend.host,
                port: this._options.backend.port,
                ssl: this._options.backend.ssl,
                database: team.hashid,
                user: this._options.backend.user,
                password: this._options.backend.password
            }
            const teamClient = libPg.newClient(options)
            try {
                await teamClient.connect()
                await teamClient.query(`DROP TABLE ${libPg.pg.escapeIdentifier(tableName)}`)
            } finally {
                teamClient.end()
            }
        } catch (err) {
            console.error('Error retrieving table:', err)
            throw new Error(`Failed to drop table ${tableName} for team ${team.hashid}: ${err.message}`)
        }
    },
    createColumn: async function (team, database, table, column) {},
    removeColumn: async function (team, database, table, column) {}
}
