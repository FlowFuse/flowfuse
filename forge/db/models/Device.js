/**
 * A Device
 * @namespace forge.db.models.Device
 */
const { DataTypes, Op } = require('sequelize')

// const Controllers = require('../controllers')

module.exports = {
    name: 'Device',
    schema: {
        name: { type: DataTypes.STRING, allowNull: false },
        type: { type: DataTypes.STRING, allowNull: false },
        state: { type: DataTypes.STRING, allowNull: false, defaultValue: '' }
    },
    associations: function (M) {
        this.belongsTo(M.Team)
        this.belongsTo(M.Project)
        this.hasOne(M.AccessToken, {
            foreignKey: 'ownerId',
            constraints: false,
            scope: {
                ownerType: 'device'
            }
        })
    },
    hooks: function (M) {
        return {
            afterDestroy: async (device, opts) => {
                await M.AccessToken.destroy({
                    where: {
                        ownerType: 'device',
                        ownerId: device.id
                    }
                })
            }
        }
    },
    finders: function (M) {
        return {
            instance: {
                // async refreshAuthTokens () {
                //     const authClient = await Controllers.AuthClient.createClientForProject(this)
                //     const projectToken = await Controllers.AccessToken.createTokenForProject(this, null, ['project:flows:view', 'project:flows:edit'])
                //     return {
                //         token: projectToken.token,
                //         ...authClient
                //     }
                // },
            },
            static: {
                byId: async (id) => {
                    if (typeof id === 'string') {
                        id = M.Device.decodeHashid(id)
                    }
                    return this.findOne({
                        where: { id: id },
                        include: [
                            {
                                model: M.Team,
                                attributes: ['hashid', 'id', 'name', 'slug', 'links']
                            },
                            {
                                model: M.Project,
                                attributes: ['id', 'name', 'links']
                            }

                        ]
                    })
                },
                byTeam: async (teamHashId) => {
                    const teamId = M.Team.decodeHashid(teamHashId)
                    return this.findAll({
                        include: [
                            {
                                model: M.Team,
                                where: { id: teamId },
                                attributes: ['hashid', 'id', 'name', 'slug', 'links']
                            },
                            {
                                model: M.Project,
                                attributes: ['id', 'name', 'links']
                            }
                        ]
                    })
                },
                getAll: async (pagination = {}, where = {}) => {
                    const limit = parseInt(pagination.limit) || 30
                    if (pagination.cursor) {
                        where.id = { [Op.gt]: M.Device.decodeHashid(pagination.cursor) }
                    }
                    const { count, rows } = await this.findAndCountAll({
                        where,
                        include: [
                            {
                                model: M.Team,
                                attributes: ['hashid', 'id', 'name', 'slug', 'links']
                            },
                            {
                                model: M.Project,
                                attributes: ['id', 'name', 'links']
                            }

                        ],
                        order: [['id', 'ASC']],
                        limit
                    })
                    return {
                        meta: {
                            next_cursor: rows.length === limit ? rows[rows.length - 1].hashid : undefined
                        },
                        count: count,
                        devices: rows
                    }
                }
            }
        }
    }
}
