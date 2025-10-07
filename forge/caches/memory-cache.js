async function initCache() {}

async function closeCache() {}

function newCache(options) {
    return new Cache()
}

class Cache {
    constructor (options) {
        this.holder = {}
    }

    async get(key) {
        return this.holder[key]
    }

    async set(key, value) {
        return this.holder[key] = value
    }

    async del(key) {
        delete this.holder[key]
    }

    async keys() {
        return Object.keys(this.holder)
    }

    async all() {
        return this.holder
    }
}

module.exports = {
    initCache,
    newCache,
    closeCache
}