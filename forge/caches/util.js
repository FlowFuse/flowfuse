/**
 * Cache keys must be strings so the memory and redis drivers behave identically.
 * Redis hash fields are coerced to strings by the client, so a non-string key
 * (e.g. a raw numeric id) would silently work against the memory driver but
 * fail, or worse, cause hard-to-trace lookups, against redis.
 * @param {*} key
 */
function assertStringKey (key) {
    if (typeof key !== 'string') {
        throw new TypeError(`Cache key must be a string, got ${typeof key}`)
    }
}

module.exports = {
    assertStringKey
}
