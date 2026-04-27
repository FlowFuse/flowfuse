const { LRUCache } = require('lru-cache')

/** @type {Record<string, Cache>} */
const caches = {}

async function initCache () {}

async function closeCache () {
    // clear all caches
    for (const cache of Object.values(caches)) {
        try {
            cache.lru.clear()
        } catch (err) {
            // ignore
        }
    }
    // delete all caches
    for (const name of Object.keys(caches)) {
        delete caches[name]
    }
}

function createCache (name, options = {}) {
    if (caches[name]) return caches[name]
    // lru-cache expects at least one of 'max', 'ttl', or 'maxSize' is required, to prevent unsafe unbounded storage.
    if (!options.ttl && !options.max && !options.maxSize) {
        options.max = 1000 // default to 1000 items if no limit is set. Will evict least recently used items when the limit is reached.
    }
    caches[name] = new Cache(name, options)
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

class Cache {
    constructor (name, options) {
        this.lru = new LRUCache(options) // {ttl, max, maxSize, ...} — lru-cache validates
    }

    async get (key) {
        return this.lru.get(key)
    }

    async set (key, value) {
        this.lru.set(key, value)
        return value
    }

    async del (key) {
        this.lru.delete(key)
    }

    async keys () {
        return [...this.lru.keys()]
    }

    async all () {
        const all = {}
        const keys = await this.keys()
        for (const key of keys) {
            all[key] = await this.get(key)
        }
        return all
    }
}

module.exports = {
    initCache,
    createCache,
    getCache,
    closeCache
}
