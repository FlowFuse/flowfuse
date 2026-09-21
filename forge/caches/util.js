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

/**
 * Scan patterns must be strings for the same driver-parity reasons as keys.
 * @param {*} pattern
 */
function assertStringPattern (pattern) {
    if (typeof pattern !== 'string') {
        throw new TypeError(`Cache scan pattern must be a string, got ${typeof pattern}`)
    }
}

const GLOB_SPECIALS = /[*?[\]\\]/g

/**
 * Escape glob special characters so a value can be embedded verbatim in a
 * scan pattern, e.g. `scan(`prefix:${escapeGlob(id)}:*`)`.
 * @param {string} value
 * @returns {string} the value with '*', '?', '[', ']' and '\' escaped
 */
function escapeGlob (value) {
    assertStringPattern(value)
    return value.replace(GLOB_SPECIALS, '\\$&')
}

const REGEXP_SPECIALS = /[.*+?^${}()|[\]\\]/g

/**
 * Convert a redis-style glob pattern (as used by SCAN/HSCAN MATCH) to a RegExp
 * so the memory driver matches keys identically to redis/valkey.
 * Supports '*' (any sequence), '?' (single char), '[abc]'/'[a-c]'/'[^a]'
 * character classes and '\' escaping.
 * @param {string} pattern glob pattern
 * @returns {RegExp}
 */
function globToRegExp (pattern) {
    let re = ''
    for (let i = 0; i < pattern.length; i++) {
        const c = pattern[i]
        if (c === '*') {
            re += '.*'
        } else if (c === '?') {
            re += '.'
        } else if (c === '\\') {
            i++
            re += i < pattern.length ? pattern[i].replace(REGEXP_SPECIALS, '\\$&') : '\\\\'
        } else if (c === '[') {
            // regex character classes share redis glob semantics ([abc], [a-c], [^a])
            const end = pattern.indexOf(']', i + (pattern[i + 1] === '^' ? 3 : 2))
            if (end === -1) {
                re += '\\[' // unterminated class — treat as a literal '['
            } else {
                re += pattern.slice(i, end + 1)
                i = end
            }
        } else {
            re += c.replace(REGEXP_SPECIALS, '\\$&')
        }
    }
    // 's' flag so '*' and '?' match newlines, as redis globs do
    return new RegExp(`^${re}$`, 's')
}

module.exports = {
    assertStringKey,
    assertStringPattern,
    escapeGlob,
    globToRegExp
}
