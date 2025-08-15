const crypto = require('crypto')

const bcrypt = require('bcrypt')
const Hashids = require('hashids/cjs')
const { Op, fn, col, where } = require('sequelize')

const hashids = {}

const URLEncode = str => str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
const base64URLEncode = str => URLEncode(str.toString('base64'))

const md5 = str => crypto.createHash('md5').update(str).digest('hex')
const sha256 = value => crypto.createHash('sha256').update(value).digest().toString('base64')

let app

/** @type {typeof import('random-words')} */
let randomWords

(async () => {
    randomWords = (await import('random-words'))
})()

/**
 * Generate a properly formed where-object for sequelize findAll, that applies
 * the required pagination, search and filter logic
 *
 * @param {Object} params the pagination options - cursor, query, limit
 * @param {Object} whereClause any pre-existing where-query clauses to include
 * @param {Array<String>} columns an array of column names to search.
 * @param {Object} filterMap pairs of filters to apply
 * @returns a `where` object that can be passed to sequelize query
 */
const buildPaginationSearchClause = (params, whereClause = {}, columns = [], filterMap = {}) => {
    whereClause = { ...whereClause }
    if (params.cursor) {
        whereClause.id = { [Op.gt]: params.cursor }
    }
    whereClause = {
        [Op.and]: [
            whereClause
        ]
    }

    for (const [key, value] of Object.entries(filterMap)) {
        if (Object.hasOwn(params, key)) {
            // A filter has been provided for key
            let clauseContainer = whereClause[Op.and]
            let param = params[key]
            if (Array.isArray(param)) {
                if (param.length > 1) {
                    clauseContainer = []
                    whereClause[Op.and].push({ [Op.or]: clauseContainer })
                }
            } else {
                param = [param]
            }
            param.forEach(p => {
                clauseContainer.push(where(fn('lower', col(value)), p.toLowerCase()))
            })
        }
    }
    if (params.query && columns.length) {
        const searchTerm = `%${params.query.toLowerCase()}%`
        const searchClauses = columns.map(colName => {
            return where(fn('lower', col(colName)), { [Op.like]: searchTerm })
        })
        const query = {
            [Op.or]: searchClauses
        }
        whereClause[Op.and].push(query)
    }
    return whereClause
}

/**
 * Get canonical email from an email address.
 * In this implementation, the canonical form of an email is the
 * address with the following processing applied:
 * * lower case it
 * * trim it
 * * return null if email is null or empty
 * * remove dots for everything before the @ sign (gmail/googlemail only)
 * * return sanitised local + @ + domain
 * KNOWN LIMITATIONS:
 * * This function does not attempt understand the aliasing rules of each provider
 * * This function does not attempt to remove tags from the local-part
 * * This function does not attempt to remove sub-domain tags
 * @param {String} email Email address to get canonical email from
 * @param {Object} options Options
 * @param {Array<String>} options.removeDotsForDomains List of domains for which dots should be removed from the local-part
 * @returns {String} Canonical email
 */
function getCanonicalEmail (email, options = { removeDotsForDomains: ['gmail.', 'googlemail.'] }) {
    // Aliasing is supported by most of the big email providers and implemented in various ways
    //      For example:
    //          Gmail allows dots to be added anywhere in the local-part (it ignores dots in the local-part)
    //          Yahoo supports a "base name" and a "keyword" (basename-keyword@yahoo.com) - upto 500 aliases
    //          Yandex.Mail permits "-".  for example, if username includes a period (e.g. alice.the.girl), you automatically receive an alias like alice-the-girl in addition to domain aliases.
    //      This function will not attempt understand the aliasing rules of each provider
    // Sub-addressing (also known as the + trick) is now supported by the most of the big email providers
    //      https://en.wikipedia.org/wiki/Comparison_of_webmail_providers#Features
    //      <local-part>?<tag>@<domain>
    //      some providers use the + sign, some use the - sign
    //      This function will not attempt to remove tags from the local-part
    // Sub-domain addressing is less popular (skiff, FastMail, and ProtonMail) but is still a thing.
    //      This function will not attempt to remove tags from the sub-domain

    if (!email || typeof email !== 'string' || email.trim().length === 0) {
        return null
    }
    email = (email + '').trim().toLocaleLowerCase()
    email = (email + '').toLowerCase().trim()
    const [local, domain] = email.split('@')
    if (domain && options.removeDotsForDomains.length >= 0) {
        for (const domainToCheck of options.removeDotsForDomains) {
            if (domain.startsWith(domainToCheck)) {
                return `${local.replace(/\./g, '')}@${domain}` // gmail ignores dots in the local part so we remove them to make the email canonical
            }
        }
    }
    return `${local}@${domain}`
}

/**
 * Generate a random 1 or more random strings
 * @param {Number} [count=1] - Number of strings to generate
 * @param {Number} [minLength=2] - Minimum length of each string
 * @param {Number} [maxLength=15] - Maximum length of each string
 * @param {Number} [wordsPerString=1] - Number of words in each string
 * @returns {Array<String>} - Array of random strings
 */
function randomStrings (count = 1, minLength = 2, maxLength = 15, wordsPerString = 1) {
    const words = randomWords.generate({
        exactly: count || 1,
        minLength: minLength || 2,
        maxLength: maxLength || 15,
        wordsPerString: wordsPerString || 1
    })
    words.sort(() => Math.random() - 0.5) // a bit of extra randomness additional to the default behaviour of `random-words` lib method
    return words
}

/**
 * Generate a random phrase
 * @param {Number} [wordCount=3] - Number of words in the phrase
 * @param {Number} [minLength=2] - Minimum length of each word
 * @param {Number} [maxLength=15] - Maximum length of each word
 * @param {String} [separator='-'] - Separator between words
 * @returns {String} - Random phrase
 */
function randomPhrase (wordCount = 3, minLength = 2, maxLength = 15, separator = '-') {
    return randomStrings(wordCount, minLength, maxLength).join(separator)
}

/**
 * @typedef {Object<string, string | { value: string, hidden?: boolean }>} EnvVarObject
 * An object mapping environment variable names to a string value or a metadata object.
 * e.g.
 * `{ VAR1: 'value1', VAR2: { value: 'value2', hidden: true } }`
 *
 * @typedef {Array<{ name: string, value: string, hidden?: boolean }>} EnvVarArray
 * An array of environment variable objects, where each object has a name and value,
 * and optionally a hidden flag.
 * e.g.
 * `[ { name: 'VAR1', value: 'value1' }, { name: 'VAR2', value: 'value2', hidden: true } ]`
 */

/**
 * Convert an array of env var objects to a key/value object, with handling of hidden vars that
 * need to retain their metadata
 * From: [ { name: 'VAR1', value: 'value1' }, { name: 'VAR2', value: 'value2', hidden: true } ]
 * To: { VAR1: 'value1', VAR2: { value: 'value2', hidden: true } }
 * @param {EnvVarArray} envArray
 * @return {EnvVarObject}
 * @see {@link mapEnvObjectToArray} for the reverse operation
*/
function mapEnvArrayToObject (envArray) {
    /** @type {EnvVarObject} */
    const envObject = {}
    envArray.forEach((envVar) => {
        const name = envVar.name
        const value = envVar.value
        if (envVar.hidden) {
            envObject[name] = {
                hidden: true
            }
            if (Object.hasOwn(envVar, 'value')) {
                envObject[name].value = value
            }
            if (Object.hasOwn(envVar, '$')) {
                envObject[name].$ = envVar.$
            }
        } else {
            envObject[name] = value
        }
    })
    return envObject
}

/**
 * Convert a key/value object of env vars to an array of env var objects
 * From: { VAR1: 'value1', VAR2: { value: 'value2', hidden: true } }
 * To: [ { name: 'VAR1', value: 'value1' }, { name: 'VAR2', value: 'value2', hidden: true } ]
 * @param {EnvVarObject} envObject
 * @return {EnvVarArray}
 * @see {@link mapEnvArrayToObject} for the reverse operation
 */
function mapEnvObjectToArray (envObject) {
    /** @type {EnvVarArray} */
    const envArray = []
    for (const [name, value] of Object.entries(envObject)) {
        if (typeof value === 'object' && value.hidden) {
            const env = {
                name,
                hidden: true
            }
            if (Object.hasOwn(value, 'value')) {
                env.value = value.value
            }
            if (Object.hasOwn(value, '$')) {
                env.$ = value.$
            }
            envArray.push(env)
        } else {
            envArray.push({
                name,
                value
            })
        }
    }
    return envArray
}

function decryptValue (secret, encryptedValue) {
    const key = crypto.createHash('sha256').update(secret).digest()
    const initVector = Buffer.from(encryptedValue.substring(0, 32), 'hex')
    encryptedValue = encryptedValue.substring(32)
    const decipher = crypto.createDecipheriv('aes-256-ctr', key, initVector)
    const decrypted = decipher.update(encryptedValue, 'base64', 'utf8') + decipher.final('utf8')
    return decrypted
}

function encryptValue (secret, plainValue) {
    const key = crypto.createHash('sha256').update(secret).digest()
    const initVector = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv('aes-256-ctr', key, initVector)
    return initVector.toString('hex') + cipher.update(plainValue, 'utf8', 'base64') + cipher.final('base64')
}

/**
 * Takes an env var key/value object and modifies it to contain only the values of the env vars
 * This handles any env vars flagged as hidden. This strips the hidden metadata - the result
 * of this function is suitable for passing to a hosted/remote instance to use as-is
 * From: { VAR1: 'value1', VAR2: { value: 'value2', hidden: true } }
 * To: { VAR1: 'value1', VAR2: 'value2' }
 * @param {EnvVarObject} envObject
 * @return {Object<string, string>}
 */
function exportEnvVarObject (envObject) {
    // Check for any hidden env vars. These are objects with a 'hidden' property set to true.
    // If so, we replace the object with just the value.
    const result = {}
    for (const envVar of Object.keys(envObject)) {
        if (Object.hasOwn(envObject[envVar], 'hidden')) {
            // The value has metadata - use the value only
            result[envVar] = envObject[envVar].value
        } else {
            // The value is the bare value - use as-is
            result[envVar] = envObject[envVar]
        }
    }
    return result
}

/**
 * Parses an nr-mqtt Node userId or clientId auth string into its components.
 * Since the client auth can only pass flags via username/clientId, we have to pass the flags in a specific format.
 * The expected format is: `mq:hosted:teamId:instanceId[:haId]` or `mq:remote:teamId:deviceId`
 * This function parses and checks the format of a given username or clientId.
 * @param {String} id - the ID to parse, expected format: `mq:hosted:teamId:instanceId[:haId]` or `mq:remote:teamId:deviceId`
 * @param {'username'|'clientId'} [kind='username'] - the kind of ID to parse `'username'` or `'clientId'`
 * @returns Parsed ID object
 */
function parseNrMqttId (id, kind = 'username') {
    const minLength = 4
    const maxLength = 5
    let expectedLength = minLength
    const result = {
        kind,
        teamId: null,
        ownerId: null,
        ownerType: null,
        haId: null,
        username: null,
        error: null,
        valid: false
    }
    const parts = id.split(':')
    if (parts.length < minLength || parts.length > maxLength) {
        result.error = 'Invalid format'
    }

    const [mq, instanceType, teamId, instanceId, part5] = parts
    if (mq !== 'mq') {
        result.error = 'Unknown format'
    }
    result.teamId = teamId
    result.ownerId = instanceId
    if (instanceType === 'hosted') {
        result.ownerType = 'project'
        result.username = `instance:${instanceId}`
        if (kind === 'clientId' && parts.length === 5) {
            expectedLength = 5
            // since a clientId can have a haId, we need to compute the username accordingly
            result.haId = part5 || null
        }
    } else if (instanceType === 'remote') {
        result.ownerType = 'device'
        result.username = `device:${instanceId}`
    } else {
        result.error = 'Invalid Type'
    }
    if (parts.length !== expectedLength) {
        result.error = 'Invalid format'
    }
    result.valid = result.error === null
    return result
}

module.exports = {
    init: _app => { app = _app },
    generateToken: (length, prefix) => (prefix ? prefix + '_' : '') + base64URLEncode(crypto.randomBytes(length || 32)),
    generateNumericToken: () => crypto.randomInt(0, 1000000).toString().padStart(6, '0'),
    hash: value => bcrypt.hashSync(value, 10),
    compareHash: (plain, hashed) => bcrypt.compareSync(plain, hashed),
    md5,
    sha256,
    URLEncode,
    base64URLEncode,
    generateUserAvatar: key => {
        const keyHash = Buffer.from(key).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
        return `/avatar/${keyHash}`
    },
    generateTeamAvatar: key => {
        const keyHash = md5(key.trim().toLowerCase())
        return `//www.gravatar.com/avatar/${keyHash}?d=identicon` // retro mp
    },
    slugify: str => str.trim().toLowerCase().replace(/ /g, '-').replace(/[^a-z0-9-_]/ig, ''),
    uppercaseFirst: str => `${str[0].toUpperCase()}${str.substr(1)}`,
    getHashId: type => {
        if (!hashids[type]) {
            // This defers trying to access app.settings until after the
            // database has been initialised
            hashids[type] = new Hashids((app.settings.get('instanceId') || '') + type, 10)
        }
        return hashids[type]
    },
    buildPaginationSearchClause,
    getCanonicalEmail,
    randomStrings,
    randomPhrase,
    mapEnvArrayToObject,
    mapEnvObjectToArray,
    exportEnvVarObject,
    encryptValue,
    decryptValue,
    parseNrMqttId
}
