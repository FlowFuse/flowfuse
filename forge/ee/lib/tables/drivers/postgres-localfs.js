const pg = require('pg')

const { generatePassword } = require('../../../../lib/userTeam')

let adminClient

module.exports = {
    init: async function (app, options) {
        this._app = app
        this._options = options || {}
        // options.max = 1
        // adminClient = new pg.Pool(options || {})
        adminClient = new pg.Client(options || {})
        // adminClient.on('connect', (client) => {
        //     this._app.log.info('Postgres LocalFS driver new client connected')
        //     client.on('error', (err) => {
        //         this._app.log.error('Postgres LocalFS driver client error', err)
        //     })
        // })
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
            throw new Error(`Database for team ${team.hashid} does not exist`)
        }
    },
    getDatabase: async function (teamId, databaseId) {
        const table = await this._app.db.models.Table.byId(teamId, databaseId)
        if (table) {
            return table
        } else {
            throw new Error(`Database ${databaseId} for team ${teamId} does not exist`)
        }
    },
    createDatabase: async function (team, name) {
        const existing = await this._app.db.models.Table.byTeamId(team.id)
        // Will need removing when we support multiple databases per team
        if (existing && existing.length > 0) {
            console.log('1 Existing tables for team', team.hashid, existing)
            throw new Error('Database already exists')
        }
        const res = await adminClient.query('SELECT datname FROM pg_database WHERE datistemplate = false AND datname = $1', [team.hashid])
        if (res.rows.length > 0) {
            throw new Error('Database already exists')
        } else {
            await adminClient.query(`CREATE DATABASE "${team.hashid}"`)
            const options = {
                host: this._options.host,
                port: this._options.port,
                ssl: this._options.ssl,
                database: team.hashid,
                user: this._options.user,
                password: this._options.password
            }
            const teamClient = new pg.Client(options)
            const password = generatePassword()
            try {
                await teamClient.connect()
                // need to generate a password for the team user
                await teamClient.query(`CREATE ROLE "${team.hashid}" WITH LOGIN PASSWORD '${password}'`)
                await teamClient.query(`GRANT CONNECT ON DATABASE "${team.hashid}" TO "${team.hashid}"`)
                // await teamClient.query(`GRANT ALL ON ALL TABLES TO "${team.hashid}"`)
            } finally {
                await teamClient.end()
            }
            this._app.log.info(`Database created for team ${team.hashid}`)
            const credentials = {
                host: this._options.host,
                port: this._options.port,
                ssl: this._options.ssl,
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
    destroyDatabase: async function (team) {
        const res = await adminClient.query('SELECT datname FROM pg_database WHERE datistemplate = false AND datname = $1', [team.hashid])
        if (res.rows.length === 1) {
            try {
                await adminClient.query(`DROP DATABASE IF EXISTS "${team.hashid}"`)
                await adminClient.query(`DROP ROLE IF EXISTS "${team.hashid}"`)
                await this._app.db.models.Table.destroy({
                    where: {
                        TeamId: team.id
                    }
                })
            } catch (err) {
                // console.log(err)
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
                host: this._options.host,
                port: this._options.port,
                ssl: this._options.ssl,
                database: team.hashid,
                user: this._options.user,
                password: this._options.password
            }
            const teamClient = new pg.Client(options)
            try {
                teamClient.connect()
                const res = await teamClient.query('SELECT "tablename" FROM "pg_catalog"."pg_tables" WHERE "schemaname" != \'pg_catalog\' AND "schemaname" != \'information_schema\'')
                if (res.rows && res.rows.length > 0) {
                    return res.rows.map(row => { return {
                        name: row.tablename,
                        schema: row.schemaname
                    }})
                } else {
                    return []
                }
            }
            finally {
                teamClient.end()
            } 
        } 
        catch (err) {
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
                host: this._options.host,
                port: this._options.port,
                ssl: this._options.ssl,
                database: team.hashid,
                user: this._options.user,
                password: this._options.password
            }
            const teamClient = new pg.Client(options)
            try {
                teamClient.connect()
                const res = await teamClient.query(`SELECT column_name, udt_name, is_nullable, column_default, character_maximum_length, is_generated FROM information_schema.columns WHERE table_name = $1`, [table])
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
                    throw new Error(`Table ${table} does not exist in database ${database} for team ${team.hashid}`)
                }
            } finally {
                teamClient.end()
            }
        } catch (err) {
            console.error('Error retrieving table:', err)
            throw new Error(`Failed to retrieve table ${table} for team ${team.hashid}: ${err.message}`)
        }
    },
    createTable: async function (team, database, table) {},
    dropTable: async function (team, database, table) {},
    getColumns: async function (team, database, table) {
    },
    createColumn: async function (team, database, table, column) {},
    removeColumn: async function (team, database, table, column) {}
}
