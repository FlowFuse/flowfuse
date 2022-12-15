const { buildPaginationSearchClause } = require('../../../db/utils')
const { DataTypes } = require('sequelize')

module.exports = {
    name: 'SAMLProvider',
    schema: {
        name: { type: DataTypes.STRING, allowNull: false },
        domainFilter: {
            type: DataTypes.STRING,
            allowNull: false,
            set (value) {
                value = (value || '').toLowerCase()
                if (value[0] !== '@') {
                    value = '@' + value
                }
                this.setDataValue('domainFilter', value)
            }
        },
        active: { type: DataTypes.BOOLEAN, defaultValue: true },
        acsURL: { type: DataTypes.VIRTUAL, get () { return process.env.FLOWFORGE_BASE_URL + '/ee/sso/login/callback' } },
        entityID: { type: DataTypes.VIRTUAL, get () { return process.env.FLOWFORGE_BASE_URL + '/ee/sso/entity/' + this.hashid } },
        options: {
            type: DataTypes.TEXT,
            set (value) {
                this.setDataValue('options', JSON.stringify(value))
            },
            get () {
                const rawValue = this.getDataValue('options') || '{}'
                return JSON.parse(rawValue)
            }
        }
    },
    finders: function (M) {
        return {
            instance: {
                getOptions: function () {
                    const self = this.toJSON()
                    const result = {
                        issuer: self.entityID,
                        callbackUrl: process.env.FLOWFORGE_BASE_URL + '/ee/sso/login/callback',
                        ...self.options
                    }
                    if (result.cert) {
                        const m = /-----BEGIN CERTIFICATE-----([\s\S]*)-----END CERTIFICATE-----/m.exec(result.cert)
                        if (m) {
                            result.cert = m[1]
                        }
                        result.cert = result.cert.replace(/[ \t\r\n]/g, '')
                    }
                    return result
                }
            },
            static: {
                byId: async (id) => {
                    if (typeof id === 'string') {
                        id = M.SAMLProvider.decodeHashid(id)
                    }
                    return this.findOne({
                        where: { id }
                    })
                },
                forEmail: async (email) => {
                    const emailParts = email.split('@')
                    const domain = '@' + emailParts.pop().toLowerCase()
                    return this.findOne({
                        where: {
                            active: true,
                            domainFilter: domain
                        }
                    })
                },
                getAll: async (pagination = {}, where = {}) => {
                    const limit = parseInt(pagination.limit) || 200
                    if (pagination.cursor) {
                        pagination.cursor = M.SAMLProvider.decodeHashid(pagination.cursor)
                    }
                    const [rows, count] = await Promise.all([
                        this.findAll({
                            where: buildPaginationSearchClause(pagination, where, ['SAMLProvider.domainFilter', 'SAMLProvider.options']),
                            order: [['id', 'ASC']],
                            limit
                        }),
                        this.count({ where })
                    ])
                    return {
                        meta: {
                            next_cursor: rows.length === limit ? rows[rows.length - 1].hashid : undefined
                        },
                        count,
                        providers: rows
                    }
                }
            }
        }
    }
}
