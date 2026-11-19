/**
 * Validation of external server details entered by team owners, and the connection details
 * the config endpoint returns to instances and devices.
 */

const SAFE_HOST = /^[A-Za-z0-9.-]{1,253}$/
const SAFE_NAME = /^[A-Za-z0-9_.-]{1,63}$/
const AUTH_TYPES = ['none', 'basic', 'bearer']
const PROTOCOL_VERSIONS = ['auto', '1', '2']

class ValidationError extends Error {
    constructor (message) {
        super(message)
        this.code = 'invalid_request'
    }
}

function port (value, label) {
    const number = Number(value)
    if (!Number.isInteger(number) || number < 1 || number > 65535) {
        throw new ValidationError(`${label} must be a port number`)
    }
    return number
}

function optionalString (value, label, max = 16384) {
    if (value === undefined || value === null || value === '') {
        return undefined
    }
    if (typeof value !== 'string' || value.length > max) {
        throw new ValidationError(`${label} is invalid`)
    }
    return value
}

/**
 * Splits external server details into the stored endpoints and the encrypted credentials.
 * Every field is checked here because these values end up in Node-RED settings on instances
 * and devices.
 * @param {{ilp: Object, pgwire: Object}} input
 * @returns {{endpoints: Object, credentials: Object}}
 */
function parseExternal (input) {
    const ilp = input?.ilp
    const pgwire = input?.pgwire
    if (!ilp || typeof ilp !== 'object' || !pgwire || typeof pgwire !== 'object') {
        throw new ValidationError('ilp and pgwire settings are required')
    }

    if (!['http', 'https'].includes(ilp.protocol)) {
        throw new ValidationError('ilp.protocol must be http or https')
    }
    if (!SAFE_HOST.test(ilp.host ?? '')) {
        throw new ValidationError('ilp.host is invalid')
    }
    const authType = ilp.authType ?? 'none'
    if (!AUTH_TYPES.includes(authType)) {
        throw new ValidationError('ilp.authType must be none, basic or bearer')
    }
    const protocolVersion = ilp.protocolVersion ?? 'auto'
    if (!PROTOCOL_VERSIONS.includes(String(protocolVersion))) {
        throw new ValidationError('ilp.protocolVersion must be auto, 1 or 2')
    }
    if (authType === 'basic' && !ilp.username) {
        throw new ValidationError('ilp.username is required for basic auth')
    }
    if (authType === 'bearer' && !ilp.token) {
        throw new ValidationError('ilp.token is required for bearer auth')
    }

    if (!SAFE_HOST.test(pgwire.host ?? '')) {
        throw new ValidationError('pgwire.host is invalid')
    }
    if (!SAFE_NAME.test(pgwire.database ?? 'qdb')) {
        throw new ValidationError('pgwire.database is invalid')
    }
    if (!SAFE_NAME.test(pgwire.user ?? '')) {
        throw new ValidationError('pgwire.user is invalid')
    }

    return {
        endpoints: {
            ilp: {
                protocol: ilp.protocol,
                host: ilp.host,
                port: port(ilp.port ?? 9000, 'ilp.port'),
                tlsVerify: ilp.tlsVerify !== false,
                tlsCa: optionalString(ilp.tlsCa, 'ilp.tlsCa'),
                protocolVersion: String(protocolVersion)
            },
            pgwire: {
                host: pgwire.host,
                port: port(pgwire.port ?? 8812, 'pgwire.port'),
                database: pgwire.database ?? 'qdb',
                ssl: pgwire.ssl === true,
                sslVerify: pgwire.sslVerify !== false,
                ca: optionalString(pgwire.ca, 'pgwire.ca')
            }
        },
        credentials: {
            ilp: {
                authType,
                username: optionalString(ilp.username, 'ilp.username', 256),
                password: optionalString(ilp.password, 'ilp.password', 1024),
                token: optionalString(ilp.token, 'ilp.token', 16384)
            },
            pgwire: {
                user: pgwire.user,
                password: optionalString(pgwire.password, 'pgwire.password', 1024)
            }
        }
    }
}

function withoutUndefined (object) {
    return Object.fromEntries(Object.entries(object).filter(([, value]) => value !== undefined))
}

/**
 * @param {Object} database TimeseriesDatabase instance
 * @param {'internal'|'external'} audience internal for hosted instances, external for devices
 * @param {{pgbouncer?: {host: string, port?: number, ssl?: boolean}}} config the timeseries config
 * @returns {{ilp: Object, pgwire: Object}}
 */
function connectionFor (database, audience, config) {
    const credentials = database.getCredentials()
    if (database.kind === 'external') {
        const { ilp, pgwire } = database.endpoints
        return {
            ilp: withoutUndefined({ ...ilp, ...credentials.ilp }),
            pgwire: withoutUndefined({ ...pgwire, ...credentials.pgwire })
        }
    }

    const { internal, external } = database.endpoints
    if (audience === 'internal') {
        return {
            ilp: {
                protocol: 'http',
                host: internal.host,
                port: internal.httpPort ?? 9000,
                authType: 'basic',
                username: credentials.httpUser,
                password: credentials.httpPassword,
                protocolVersion: 'auto'
            },
            pgwire: {
                host: internal.host,
                port: internal.pgPort ?? 8812,
                database: 'qdb',
                user: credentials.pgUser,
                password: credentials.pgPassword,
                ssl: false
            }
        }
    }

    const pgbouncer = config?.pgbouncer
    const connection = {
        ilp: {
            protocol: external.httpProtocol ?? 'https',
            host: external.host,
            port: external.httpPort ?? 443,
            authType: 'basic',
            username: credentials.httpUser,
            password: credentials.httpPassword,
            tlsVerify: true,
            protocolVersion: 'auto'
        }
    }
    if (pgbouncer?.host) {
        connection.pgwire = {
            host: pgbouncer.host,
            port: pgbouncer.port ?? 5432,
            database: database.meta.slug,
            user: credentials.pgUser,
            password: credentials.pgPassword,
            ssl: pgbouncer.ssl === true
        }
    }
    return connection
}

module.exports = {
    parseExternal,
    connectionFor,
    ValidationError
}
