const bcrypt = require('bcrypt')
const crypto = require('crypto')
const Hashids = require('hashids/cjs')
const { Op, fn, col, where } = require('sequelize')

const hashids = {}

const base64URLEncode = str => str.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')

const md5 = str => crypto.createHash('md5').update(str).digest('hex')
const sha256 = value => crypto.createHash('sha256').update(value).digest().toString('base64')

let app

/**
 * Generate a properly formed where-object for sequelize findAll, that applies
 * the required pagination and search logic
 *
 * @param {Object} params the pagination options - cursor, query, limit
 * @param {Object} whereClause any pre-existing where-query clauses to include
 * @param {Array<String>} columns an array of column names to search.
 * @returns a `where` object that can be passed to sequelize query
 */
const buildPaginationSearchClause = (params, whereClause = {}, columns = []) => {
    whereClause = { ...whereClause }
    if (params.cursor) {
        whereClause.id = { [Op.gt]: params.cursor }
    }
    if (params.query && columns.length) {
        const searchTerm = `%${params.query.toLowerCase()}%`
        const searchClauses = columns.map(colName => {
            return where(fn('lower', col(colName)), { [Op.like]: searchTerm })
        })
        const query = {
            [Op.or]: searchClauses
        }
        if (whereClause.id) {
            whereClause = {
                [Op.and]: [
                    whereClause,
                    query
                ]
            }
        } else {
            whereClause = query
        }
    }
    return whereClause
}

module.exports = {
    init: _app => { app = _app },
    generateToken: (length, prefix) => (prefix ? prefix + '_' : '') + base64URLEncode(crypto.randomBytes(length || 32)),
    hash: value => bcrypt.hashSync(value, 10),
    compareHash: (plain, hashed) => bcrypt.compareSync(plain, hashed),
    md5,
    sha256,
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
    buildPaginationSearchClause
}
