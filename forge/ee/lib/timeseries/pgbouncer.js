/**
 * Builds the team list for the PgBouncer that gives remote devices PGWire access to their
 * team's managed QuestDB server.
 *
 * PgBouncer authenticates the client against userlist.txt, then logs in to the server named by
 * the requested database with the same user name and password. It doesn't tie users to
 * databases, so isolation relies on every team server having its own user name and on the
 * database entries never forcing a user. That's why render() refuses shared user names and
 * never writes user= or password= into databases.ini.
 *
 * External servers that teams connect themselves never go through PgBouncer and must not be
 * passed in.
 */
const fs = require('fs/promises')
const path = require('path')

// Database and user names come from team hashids, and hosts from driver resource names.
// Anything else is refused, so a value can never break out of its line in either file.
const SAFE_NAME = /^[A-Za-z0-9_-]{1,63}$/
const SAFE_HOST = /^[A-Za-z0-9.-]{1,253}$/

const DATABASES_FILE = 'databases.ini'
const USERLIST_FILE = 'userlist.txt'

function assertPort (port, label) {
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error(`Invalid ${label}: ${port}`)
    }
}

/**
 * @param {Array<{database: string, host: string, port?: number, dbname?: string, user: string, password: string, maxConnections?: number}>} servers
 *   one entry per ready managed team server
 * @param {{maxConnectionsPerTeam?: number}} [options]
 * @returns {{databases: string, userlist: string}} contents of databases.ini and userlist.txt
 */
function render (servers, options = {}) {
    const databases = new Set()
    const users = new Set()
    const entries = servers.map(server => {
        const { database, host, user, password } = server
        const port = server.port ?? 8812
        const dbname = server.dbname ?? 'qdb'
        const maxConnections = server.maxConnections ?? options.maxConnectionsPerTeam

        if (!SAFE_NAME.test(database ?? '')) {
            throw new Error(`Invalid database name: ${database}`)
        }
        if (!SAFE_NAME.test(dbname)) {
            throw new Error(`Invalid dbname for ${database}: ${dbname}`)
        }
        if (!SAFE_NAME.test(user ?? '')) {
            throw new Error(`Invalid user name for ${database}: ${user}`)
        }
        if (!SAFE_HOST.test(host ?? '')) {
            throw new Error(`Invalid host for ${database}: ${host}`)
        }
        assertPort(port, `port for ${database}`)
        if (typeof password !== 'string' || password.length === 0 || /[\r\n]/.test(password)) {
            throw new Error(`Invalid password for ${database}`)
        }
        if (maxConnections !== undefined) {
            assertPort(maxConnections, `connection limit for ${database}`)
        }
        if (databases.has(database)) {
            throw new Error(`Duplicate database: ${database}`)
        }
        if (users.has(user)) {
            throw new Error(`User ${user} is used by more than one team server`)
        }
        databases.add(database)
        users.add(user)
        return { database, host, port, dbname, user, password, maxConnections }
    })

    // A stable order means unchanged team lists produce identical files and no reload
    entries.sort((a, b) => a.database.localeCompare(b.database))

    const databaseLines = entries.map(entry => {
        let line = `${entry.database} = host=${entry.host} port=${entry.port} dbname=${entry.dbname}`
        if (entry.maxConnections !== undefined) {
            line += ` max_db_connections=${entry.maxConnections}`
        }
        return line
    })
    // auth_file escapes a double quote by doubling it
    const userLines = entries.map(entry => `"${entry.user}" "${entry.password.replace(/"/g, '""')}"`)

    return {
        databases: ['[databases]', ...databaseLines].join('\n') + '\n',
        userlist: userLines.length ? userLines.join('\n') + '\n' : ''
    }
}

// PgBouncer runs as a different user from forge, so the files have to be world-readable, the
// same as Kubernetes Secret files by default. Only forge and PgBouncer mount the directory.
async function writeAtomic (file, content) {
    const tmp = `${file}.${process.pid}.tmp`
    await fs.writeFile(tmp, content, { mode: 0o644 })
    await fs.rename(tmp, file)
}

/**
 * Writes the team list into the directory PgBouncer reads (Docker Compose). PgBouncer's wrapper
 * script notices the change and reloads.
 *
 * The user list is written first so a new database never appears before its user.
 * @param {string} dir
 * @param {{databases: string, userlist: string}} files output of render()
 */
async function writeToDirectory (dir, files) {
    await fs.mkdir(dir, { recursive: true })
    await writeAtomic(path.join(dir, USERLIST_FILE), files.userlist)
    await writeAtomic(path.join(dir, DATABASES_FILE), files.databases)
}

/**
 * Data for the Kubernetes Secret PgBouncer mounts (`timeseries-pgbouncer`)
 * @param {{databases: string, userlist: string}} files output of render()
 */
function toSecretData (files) {
    return {
        [DATABASES_FILE]: Buffer.from(files.databases).toString('base64'),
        [USERLIST_FILE]: Buffer.from(files.userlist).toString('base64')
    }
}

module.exports = {
    render,
    writeToDirectory,
    toSecretData,
    DATABASES_FILE,
    USERLIST_FILE
}
