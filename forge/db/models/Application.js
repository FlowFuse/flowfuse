/**
 * An application definition
 * @namespace forge.db.models.Application
 */
const { DataTypes, Op } = require('sequelize')

const { KEY_SETTINGS, KEY_HA } = require('./ProjectSettings')

module.exports = {
    name: 'Application',
    schema: {
        name: { type: DataTypes.STRING, allowNull: false },
        description: { type: DataTypes.STRING, defaultValue: '' }
    },
    associations: function (M) {
        this.hasMany(M.Project)
        this.hasMany(M.Project, { as: 'Instances' })
        this.belongsTo(M.Team, { foreignKey: { allowNull: false } })
        this.hasMany(M.DeviceGroup, { foreignKey: { allowNull: true } })
    },
    finders: function (M) {
        return {
            static: {
                byId: async function (idOrHash) {
                    let id = idOrHash
                    if (typeof idOrHash === 'string') {
                        id = M.Application.decodeHashid(idOrHash)
                    }
                    return this.findOne({
                        where: { id },
                        include: [
                            {
                                model: M.Team,
                                attributes: ['hashid', 'id', 'name', 'slug', 'links', 'TeamTypeId']
                            }
                        ]
                    })
                },
                byTeam: async (teamIdOrHash, { includeInstances = false, includeInstanceStorageFlow = false } = {}) => {
                    let id = teamIdOrHash
                    if (typeof teamIdOrHash === 'string') {
                        id = M.Team.decodeHashid(teamIdOrHash)
                    }

                    const includes = [
                        {
                            model: M.Team,
                            attributes: ['hashid', 'id', 'name', 'slug', 'links', 'TeamTypeId'],
                            where: { id }
                        }
                    ]

                    if (includeInstances) {
                        const include = {
                            model: M.Project,
                            as: 'Instances',
                            attributes: ['hashid', 'id', 'name', 'slug', 'links', 'url', 'state'],
                            include: [
                                // Need for project URL calculation (depends on httpAdminRoot)
                                {
                                    model: M.ProjectTemplate,
                                    attributes: ['hashid', 'id', 'name', 'links', 'settings', 'policy']
                                }, {
                                    model: M.ProjectSettings,
                                    where: {
                                        [Op.or]: [
                                            { key: KEY_SETTINGS },
                                            { key: KEY_HA }
                                        ]
                                    },
                                    required: false
                                }
                            ]
                        }

                        if (includeInstanceStorageFlow) {
                            // Used for instance status
                            include.include.push({
                                model: M.StorageFlow,
                                attributes: ['id', 'updatedAt']
                            })
                        }

                        includes.push(include)
                    }

                    return this.findAll({
                        include: includes
                    })
                }
            },
            instance: {
                projectCount: async function () {
                    return await M.Project.count({
                        where: { ApplicationId: this.id }
                    })
                }
            }
        }
    }
}
