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
    getDatabase: async function (team, database) {
        const table = await this._app.db.models.Table.byId(database, team.id)
        if (table) {
            return table.credentials
        } else {
            throw new Error(`Database ${database} for team ${team.hashid} does not exist`)
        }
    },
    createDatabase: async function (team) {
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
            this._app.db.models.Table.create({
                TeamId: team.id,
                credentials
            })
            return credentials
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
    getTables: async (team, database) => {},
    getTable: async (team, database, table) => {},
    createTable: async (team, database, table) => {},
    dropTable: async (team, database, table) => {},
    getColumns: async (team, database, table) => {},
    createColumn: async (team, database, table, column) => {},
    removeColumn: async (team, database, table, column) => {}
}
