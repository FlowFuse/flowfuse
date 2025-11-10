const caches = {}

async function initCache () {}

async function closeCache () {}

function getCache (name, options) {
    if (!caches[name]) {
        caches[name] = new Cache(name, options)
    }
    return caches[name]
}

class Cache {
    constructor (name, options) {
        this.holder = {}
    }

    async get (key) {
        return this.holder[key]
    }

    async set (key, value) {
        this.holder[key] = value
        return value
    }

    async del (key) {
        delete this.holder[key]
    }

    async keys () {
        return Object.keys(this.holder)
    }

    async all () {
        return this.holder
    }
}

module.exports = {
    initCache,
    getCache,
    closeCache
}
