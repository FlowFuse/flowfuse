const { createClient } = require('@redis/client')

const caches = {}

let url
let client

async function initCache (options) {
    url = options.url
    client = createClient()
    await client.connect({ url })
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
        return JSON.parse(await this.client.hGet(this.name, key))
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
