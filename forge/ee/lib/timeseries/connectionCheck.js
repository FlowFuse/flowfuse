/**
 * Checks that forge can reach an external QuestDB server over ILP (HTTP /ping) and PGWire
 * (SELECT 1), so the team owner sees straight away whether the details they entered work.
 *
 * forge connects to hosts the team owner typed in, so this is a server-side request on their
 * behalf. Unless allowPrivateNetworks is set, every resolved address must be public: loopback,
 * private, link-local (including cloud metadata), CGNAT and similar ranges are refused. The
 * connection then goes to the address that was checked, so a second DNS answer can't redirect
 * it. Errors are reduced to a short code so the check can't be used to read internal responses.
 */
const dns = require('dns/promises')
const http = require('http')
const https = require('https')
const net = require('net')

const { Client } = require('pg')

const TIMEOUT = 5000

const blocked = new net.BlockList()
for (const [address, prefix] of [
    ['0.0.0.0', 8],
    ['10.0.0.0', 8],
    ['100.64.0.0', 10],
    ['127.0.0.0', 8],
    ['169.254.0.0', 16],
    ['172.16.0.0', 12],
    ['192.0.0.0', 24],
    ['192.168.0.0', 16],
    ['198.18.0.0', 15],
    ['224.0.0.0', 4],
    ['240.0.0.0', 4]
]) {
    blocked.addSubnet(address, prefix, 'ipv4')
}
for (const [address, prefix] of [
    ['::', 128],
    ['::1', 128],
    ['fc00::', 7],
    ['fe80::', 10],
    ['ff00::', 8]
]) {
    blocked.addSubnet(address, prefix, 'ipv6')
}

// IPv4-mapped IPv6 addresses (::ffff:a.b.c.d, in any notation) are refused outright: public
// DNS doesn't hand them out, and they could carry a private IPv4 address. They live in their
// own list because a ::ffff:0:0/96 rule in the main list would also match every IPv4 lookup.
const mapped = new net.BlockList()
mapped.addSubnet('::ffff:0:0', 96, 'ipv6')

function isBlocked (address, family) {
    if (family === 6) {
        return mapped.check(address, 'ipv6') || blocked.check(address, 'ipv6')
    }
    return blocked.check(address, 'ipv4')
}

class CheckError extends Error {
    constructor (code) {
        super(code)
        this.code = code
    }
}

/**
 * @param {string} host
 * @param {boolean} allowPrivateNetworks
 * @returns {Promise<string>} the address to connect to
 */
async function resolveAllowed (host, allowPrivateNetworks) {
    let addresses
    try {
        addresses = await dns.lookup(host, { all: true, verbatim: true })
    } catch (_) {
        throw new CheckError('host_not_found')
    }
    if (addresses.length === 0) {
        throw new CheckError('host_not_found')
    }
    if (!allowPrivateNetworks) {
        for (const { address, family } of addresses) {
            if (isBlocked(address, family)) {
                throw new CheckError('private_address_not_allowed')
            }
        }
    }
    // Prefer IPv4, which more servers listen on
    const preferred = addresses.find(({ family }) => family === 4) || addresses[0]
    return preferred.address
}

function errorCode (err) {
    if (err instanceof CheckError) {
        return err.code
    }
    if (err?.code === 'ECONNREFUSED') {
        return 'connection_refused'
    }
    if (err?.code === 'ETIMEDOUT' || err?.code === 'timeout') {
        return 'timeout'
    }
    if (err?.code === '28P01' || err?.code === '28000' || /password|auth/i.test(err?.message || '')) {
        return 'authentication_failed'
    }
    if (/certificate|self.signed|SSL|TLS/i.test(err?.message || '') || /^(CERT_|ERR_TLS|DEPTH_ZERO|UNABLE_TO)/.test(err?.code || '')) {
        return 'tls_error'
    }
    return 'connection_failed'
}

function ilpRequest (ilp, address) {
    return new Promise((resolve, reject) => {
        const secure = ilp.protocol === 'https'
        const headers = {}
        if (ilp.authType === 'basic') {
            headers.Authorization = 'Basic ' + Buffer.from(`${ilp.username ?? ''}:${ilp.password ?? ''}`).toString('base64')
        } else if (ilp.authType === 'bearer') {
            headers.Authorization = `Bearer ${ilp.token ?? ''}`
        }
        const options = {
            method: 'GET',
            path: '/ping',
            port: ilp.port,
            headers,
            timeout: TIMEOUT,
            // Connect to the checked address, keep the hostname for Host and TLS
            host: ilp.host,
            lookup: (_hostname, opts, callback) => {
                if (opts?.all) {
                    callback(null, [{ address, family: net.isIP(address) }])
                } else {
                    callback(null, address, net.isIP(address))
                }
            }
        }
        if (secure) {
            options.servername = ilp.host
            options.rejectUnauthorized = ilp.tlsVerify !== false
            if (ilp.tlsCa) {
                options.ca = ilp.tlsCa
            }
        }
        const req = (secure ? https : http).request(options, res => {
            res.resume()
            if (res.statusCode === 401 || res.statusCode === 403) {
                reject(new CheckError('authentication_failed'))
            } else if (res.statusCode >= 200 && res.statusCode < 300) {
                resolve()
            } else {
                reject(new CheckError('unexpected_response'))
            }
        })
        req.on('timeout', () => req.destroy(Object.assign(new Error('timeout'), { code: 'timeout' })))
        req.on('error', reject)
        req.end()
    })
}

async function pgwireQuery (pgwire, address) {
    let ssl = false
    if (pgwire.ssl) {
        ssl = { rejectUnauthorized: pgwire.sslVerify !== false, servername: pgwire.host }
        if (pgwire.ca) {
            ssl.ca = pgwire.ca
        }
    }
    const client = new Client({
        host: address,
        port: pgwire.port,
        user: pgwire.user,
        password: pgwire.password,
        database: pgwire.database,
        ssl,
        connectionTimeoutMillis: TIMEOUT,
        query_timeout: TIMEOUT
    })
    try {
        await client.connect()
        await client.query('SELECT 1')
    } finally {
        await client.end().catch(() => {})
    }
}

async function checkOne (fn, settings, allowPrivateNetworks) {
    if (!settings?.host) {
        return { ok: false, error: 'not_configured' }
    }
    try {
        const address = await resolveAllowed(settings.host, allowPrivateNetworks)
        await fn(settings, address)
        return { ok: true }
    } catch (err) {
        return { ok: false, error: errorCode(err) }
    }
}

/**
 * @param {{ilp: Object, pgwire: Object}} connection full connection details, credentials included
 * @param {{allowPrivateNetworks?: boolean}} [options]
 * @returns {Promise<{ilp: {ok: boolean, error?: string}, pgwire: {ok: boolean, error?: string}}>}
 */
async function check (connection, options = {}) {
    const allowPrivateNetworks = options.allowPrivateNetworks === true
    const [ilp, pgwire] = await Promise.all([
        checkOne(ilpRequest, connection.ilp, allowPrivateNetworks),
        checkOne(pgwireQuery, connection.pgwire, allowPrivateNetworks)
    ])
    return { ilp, pgwire }
}

module.exports = {
    check,
    resolveAllowed
}
