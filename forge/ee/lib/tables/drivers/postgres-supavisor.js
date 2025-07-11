const axios = require('axios')
const pg = require('pg')
// const local = require('./postgres-localfs')

const { generatePassword } = require('../../../../lib/userTeam')

let adminClient

module.exports = {
    init: async function (app, options) {
        this._app = app
        this._options = options

        if (!options.database) {
            throw new Error('Postgres LocalFS driver requires database options to be provided')
        }
        adminClient = new pg.Client(options.database || {})
        adminClient.on('error', (err) => {
            this._app.log.error('Postgres Supavisor driver error:', err)
        })
        try {
            await adminClient.connect()
        } catch (err) {
            app.log.error('Failed to connect to Postgres:', err)
        }
        app.log.info('Postgres Supavisor driver initialized')
    },
    shutdown: async function (app) {
        try {
            this._app.log.info('Shutting down Postgres Supavisor driver')
            await adminClient.end()
        } catch (err) {
            this._app.log.debug('Error shutting down Postgres Supavisor driver:', err)
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
            throw new Error('Database already exists')
        }
        const password = generatePassword(16)
        const response = await axios.put(`${this._options.supavisor.url}/api/tenants`,{
            tenant: {
                db_host: this._options.backend.host,
                db_port: this._options.backend.port,
                db_database: team.hashid,
                external_id: team.hashid,
                ip_version: 'auto',
                upstream_ssl: this._options.backend.ssl,
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
                        max_connections: 10,
                    }
                ]
            }
        },{
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this._options.supavisor.token}`
            }
        })
    },
    destroyDatabase: async function (team, databaseId) {
        const response = await axios.delete(`${this._options.supavisor.url}/api/tenants/${team.hashid}`,{
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this._options.supavisor.token}`
            }
        })
    },
    getTables: async function (team, databaseId) {},
    getTable: async function (team, databaseId, tableName) {},
    getTableData: async function (team, database, table, rows) {},
    createTable: async function (team, databaseId, table) {},
    dropTable: async function (team, databaseId, tableName) {},
    createColumn: async function (team, database, table, column) {},
    removeColumn: async function (team, database, table, column) {}
}
