const { createClient } = require('@redis/client')

/** @type {Record<string, Cache>} */
const caches = {}

/** @type {import('@redis/client').RedisClientType} */
let client

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
    // eslint-disable-next-line n/handle-callback-err
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
    const { ttl } = options
    if (caches[name]) {
        return caches[name]
    }
    caches[name] = new Cache(name, { client, ttl })
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
    constructor (name, { client, ttl }) {
        this.name = name
        /** @type {import('@redis/client').RedisClientType} */
        this.client = client
        this.ttl = ttl // milliseconds
    }

    async get (key) {
        const val = JSON.parse(await this.client.hGet(this.name, key))
        if (val !== null) {
            return val
        } else {
            return undefined
        }
    }

    async set (key, value) {
        await this.client.hSet(this.name, key, JSON.stringify(value))
        if (this.ttl > 0) {
            await this.client.hpExpire(this.name, key, this.ttl)
        }
        return value
    }

    async del (key) {
        await this.client.hDel(this.name, key)
    }

    async keys () {
        const keys = await this.client.hKeys(this.name)
        return keys
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
