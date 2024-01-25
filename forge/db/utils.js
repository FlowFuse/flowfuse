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

module.exports = {
    init: _app => { app = _app },
    generateToken: (length, prefix) => (prefix ? prefix + '_' : '') + base64URLEncode(crypto.randomBytes(length || 32)),
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
    randomPhrase
}
