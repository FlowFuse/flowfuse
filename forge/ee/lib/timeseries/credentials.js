const crypto = require('crypto')

const ALPHABET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
const SLUG_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789'

function randomString (length, alphabet) {
    // Rejection sampling keeps every character equally likely
    const limit = 256 - (256 % alphabet.length)
    let result = ''
    while (result.length < length) {
        for (const byte of crypto.randomBytes(length * 2)) {
            if (byte < limit && result.length < length) {
                result += alphabet[byte % alphabet.length]
            }
        }
    }
    return result
}

/**
 * Lowercase, DNS-safe and unguessable name for a managed server. Used for Kubernetes and
 * Docker resource names, the external hostname and the PgBouncer database name. Team hashids
 * are mixed case, so they can't be used where names are case-insensitive.
 */
function generateSlug () {
    // Starts with a letter so it's valid everywhere a name is
    return randomString(1, 'abcdefghijklmnopqrstuvwxyz') + randomString(11, SLUG_ALPHABET)
}

/**
 * Credentials for a new managed server. The user name is unique per server, which PgBouncer
 * relies on for isolation between teams.
 * @param {string} slug
 */
function generateManagedCredentials (slug) {
    const user = `t_${slug}`
    return {
        httpUser: user,
        httpPassword: randomString(24, ALPHABET),
        pgUser: user,
        pgPassword: randomString(24, ALPHABET)
    }
}

/**
 * Ensures the platform secret used to encrypt credentials exists
 * @param {import('../../../forge').ForgeApplication} app
 */
async function ensureSecret (app) {
    if (!app.settings.get('timeseriesSecret')) {
        await app.settings.set('timeseriesSecret', crypto.randomBytes(32).toString('hex'))
    }
}

module.exports = {
    generateSlug,
    generateManagedCredentials,
    ensureSecret,
    randomString
}
