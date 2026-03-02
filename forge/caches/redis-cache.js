const { createClient } = require('@redis/client')

const caches = {}

let client

async function initCache (options) {
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
    client.on('error', (err) => {})
    client.on('end', () => {})
    client.on('reconnecting', () => {})
    client.on('connected', () => {})
    client.on('ready', () => {})
    try {
        await client.connect()
    } catch (err) {
    }
}

function getCache (name, options) {
    if (!caches[name]) {
        caches[name] = new Cache(name, { client, ...options })
    }
    return caches[name]
}

async function closeCache () {
    client.close()
}

class Cache {
    constructor (name, options) {
        this.name = name
        this.client = options.client
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
    getCache,
    closeCache
}
