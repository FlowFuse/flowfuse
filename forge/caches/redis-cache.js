/**
 * Redis/Valkey cache driver. Caches with a ttl use per-field hash TTLs
 * (HPEXPIRE), which requires Redis >= 7.4 or Valkey >= 9.0 — set() throws
 * "unknown command" on older servers. HGETEX (Redis >= 8.0, Valkey >= 9.0)
 * is used opportunistically for updateAgeOnGet, with a fallback for servers
 * without it.
 */
const { createClient } = require('@redis/client')

const { assertStringKey, assertStringPattern } = require('./util')

/** @type {Record<string, Cache>} */
const caches = {}

/** @type {import('@redis/client').RedisClientType} */
let client

/** Whether the server supports HGETEX (Redis 8+). null = unknown, determined on first use */
let hGetExSupported = null

async function initCache (options, app) {
    const newOptions = {
        ...options,
        socket: {
            reconnectStrategy: (retries, cause) => {
                // Generate a random jitter between 0 – 200 ms:
                const jitter = Math.floor(Math.random() * 200)
                // Delay is an exponential back off, (times^2) * 50 ms, with a maximum value of 2000 ms:
                const delay = Math.min(Math.pow(2, retries) * 50, 2000)
                return delay + jitter
            }
        }
    }
    client = createClient(newOptions)

    client.on('error', (err) => {
        app.log.info(`Valkey Cache error ${err}`)
    })
    client.on('end', () => {})
    client.on('reconnecting', () => {
        app.log.info('Valkey Cache reconnecting')
    })
    client.on('connected', () => {
    })
    client.on('ready', () => {
        app.log.info('Valkey Cache connected and ready')
    })
    try {
        await client.connect()
    } catch (err) {
    }
}

function createCache (name, options = {}) {
    const { ttl, updateAgeOnGet } = options
    if (caches[name]) {
        return caches[name]
    }
    caches[name] = new Cache(name, { client, ttl, updateAgeOnGet })
    return caches[name]
}

function getCache (name) {
    if (!caches[name]) {
        // create with options if it doesn't exist
        const options = arguments.length > 1 ? arguments[1] : {}
        return createCache(name, options)
    }
    return caches[name]
}

async function closeCache () {
    try {
        if (client?.isOpen) {
            await client.close()
        }
    } catch (err) {
        // already closed / never connected — nothing to do
    }
}

class Cache {
    constructor (name, { client, ttl, updateAgeOnGet }) {
        this.name = name
        /** @type {import('@redis/client').RedisClientType} */
        this.client = client
        this.ttl = ttl // milliseconds
        this.updateAgeOnGet = !!updateAgeOnGet
    }

    async get (key) {
        assertStringKey(key)
        const refreshTTL = this.updateAgeOnGet && this.ttl > 0
        const raw = refreshTTL ? await this._getAndRefreshTTL(key) : await this.client.hGet(this.name, key)
        return JSON.parse(raw) ?? undefined
    }

    /**
     * Get a hash field and refresh its TTL. Uses HGETEX (single round trip, Redis 8+)
     * when available, otherwise falls back to HGET + HPEXPIRE.
     * @param {string} key The field to get
     * @returns {Promise<string|null>} The raw field value, or null if not present
     */
    async _getAndRefreshTTL (key) {
        if (hGetExSupported !== false && typeof this.client.hGetEx === 'function') {
            try {
                const [raw] = await this.client.hGetEx(this.name, key, { expiration: { type: 'PX', value: this.ttl } })
                hGetExSupported = true
                return raw ?? null
            } catch (err) {
                if (hGetExSupported === null && /unknown command/i.test(err?.message || '')) {
                    hGetExSupported = false // server does not support HGETEX — use the fallback
                } else {
                    throw err
                }
            }
        }
        const raw = await this.client.hGet(this.name, key)
        if (raw !== null) {
            await this.client.hpExpire(this.name, key, this.ttl)
        }
        return raw
    }

    async set (key, value) {
        assertStringKey(key)
        await this.client.hSet(this.name, key, JSON.stringify(value))
        if (this.ttl > 0) {
            await this.client.hpExpire(this.name, key, this.ttl)
        }
        return value
    }

    async del (key) {
        assertStringKey(key)
        await this.client.hDel(this.name, key)
    }

    async keys () {
        const keys = await this.client.hKeys(this.name)
        return keys
    }

    /**
     * Find keys matching a redis-style glob pattern ('*', '?', '[abc]', '\' escape),
     * e.g. 'response:*'. Does not refresh TTLs.
     * @param {string} pattern glob pattern to match keys against
     * @returns {Promise<string[]>} the matching keys
     */
    async scan (pattern) {
        assertStringPattern(pattern)
        const keys = new Set() // HSCAN may return the same field more than once across iterations
        let cursor = '0'
        do {
            const res = await this.client.hScan(this.name, cursor, { MATCH: pattern, COUNT: 100 })
            cursor = res.cursor
            for (const entry of res.entries) {
                keys.add(entry.field)
            }
        } while (cursor !== '0')
        return [...keys]
    }

    async all () {
        const values = await this.client.hGetAll(this.name)
        const newObj = {}
        for (const k of Object.keys(values)) {
            newObj[k] = JSON.parse(values[k])
        }
        return newObj
    }
}

module.exports = {
    initCache,
    createCache,
    getCache,
    closeCache
}
