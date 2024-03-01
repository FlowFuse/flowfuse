const { DataTypes, Op } = require('sequelize')

const { uppercaseFirst, sha256 } = require('../utils')

module.exports = {
    name: 'AccessToken',
    schema: {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        token: {
            type: DataTypes.STRING,
            primaryKey: false,
            allowNull: false,
            unique: true,
            set (value) {
                this.setDataValue('token', sha256(value))
            }
        },
        expiresAt: { type: DataTypes.DATE },
        scope: {
            type: DataTypes.STRING,
            allowNull: false,
            get () {
                const rawValue = this.getDataValue('scope') || ''
                return rawValue.split(',')
            },
            set (value) {
                if (Array.isArray(value)) {
                    this.setDataValue('scope', value.join(','))
                } else {
                    this.setDataValue('scope', value)
                }
            }
        },
        ownerId: { type: DataTypes.STRING },
        ownerType: { type: DataTypes.STRING },
        refreshToken: {
            type: DataTypes.STRING,
            set (value) {
                if (typeof value === 'string') {
                    this.setDataValue('refreshToken', sha256(value))
                }
            }
        },
        name: { type: DataTypes.STRING }
    },
    associations: function (M) {
        this.belongsTo(M.Team, { foreignKey: 'ownerId', constraints: false })
        this.belongsTo(M.Project, { foreignKey: 'ownerId', constraints: false })
        this.belongsTo(M.Device, { foreignKey: 'ownerId', constraints: false })
        this.belongsTo(M.User, { foreignKey: 'ownerId', constraints: false })
    },
    finders: function (M) {
        return {
            static: {
                byId: async (id) => {
                    if (typeof id === 'string') {
                        id = M.AccessToken.decodeHashid(id)
                    }
                    return this.findOne({
                        where: { id }
                    })
                },
                byRefreshToken: async (refreshToken) => {
                    const hashedToken = sha256(refreshToken)
                    return await this.findOne({ where: { refreshToken: hashedToken } })
                },
                getProvisioningTokens: async (pagination = {}, team) => {
                    // pagination not implemented at this time
                    // const limit = parseInt(pagination.limit) || 1000
                    // if (pagination.cursor) {
                    //     pagination.cursor = decodeHashid(pagination.cursor)
                    // }
                    const rows = await this.findAll({
                        where: {
                            ownerType: 'team',
                            ownerId: ('' + team.id)
                        },
                        order: [['id', 'ASC']],
                        // limit,
                        attributes: ['id', 'ownerType', 'ownerId', 'scope', 'expiresAt']
                    })
                    const tokens = []
                    rows.forEach(row => {
                        if (row.scope.includes('device:provision')) {
                            tokens.push(row)
                        }
                    })
                    return {
                        meta: {
                            next_cursor: undefined
                        },
                        count: tokens.length,
                        tokens
                    }
                },
                getPersonalAccessTokens: async (user) => {
                    const tokens = this.findAll({
                        where: {
                            ownerType: 'user',
                            ownerId: '' + user.id,
                            name: { [Op.ne]: null }
                        },
                        order: [['id', 'ASC']],
                        attributes: ['id', 'name', 'scope', 'expiresAt']
                    })
                    return tokens
                },
                getProjectHTTPTokens: async (project) => {
                    const tokens = this.findAll({
                        where: {
                            ownerType: 'http',
                            ownerId: '' + project.id
                        },
                        order: [['id', 'ASC']],
                        attributes: ['id', 'name', 'scope', 'expiresAt']
                    })
                    return tokens
                }
            },
            instance: {
                getOwner: async function (options) {
                    if (!this.ownerType) return null
                    const mixinMethodName = `get${uppercaseFirst(this.ownerType)}`
                    return this[mixinMethodName](options)
                }
            }
        }
    }
}
