const { createClient } = require('@redis/client')

let url
let client

async function initCache (options) {
    url = options.url
    client = createClient()
    await client.connect({url})
}

function newCache(options) {
    return new Cache({client, ...options})
}

async function closeCache() {
    client.close()
}

class Cache {
    constructor (options) {
        this.prefix = options.prefix
        this.client = options.client
    }

    async get(key) {
        return JSON.parse(await this.client.hGet(this.prefix, key))
    }

    async set(key, value) {
        await this.client.hSet(this.prefix, key, JSON.stringify(value))
        return value
    }

    async del(key) {
        await this.client.hDel(this.prefix, key)
    }

    async keys() {
        let keys = await this.client.hKeys(this.prefix)
        return keys
    }

    async all() {
        const values = await this.client.hGetAll(this.prefix)
        const newObj = {}
        for(const k of Object.keys(values)) {
            newObj[k] = JSON.parse(values[k])
        }
        return newObj
    }
}

module.exports = {
    initCache,
    newCache,
    closeCache
}