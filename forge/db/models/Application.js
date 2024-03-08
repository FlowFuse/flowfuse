/**
 * An application definition
 * @namespace forge.db.models.Application
 */
const { DataTypes, Op, literal } = require('sequelize')

const { KEY_SETTINGS, KEY_HA } = require('./ProjectSettings')

module.exports = {
    name: 'Application',
    schema: {
        name: { type: DataTypes.STRING, allowNull: false },
        description: { type: DataTypes.STRING, defaultValue: '' }
    },
    hooks: function (M, app) {
        return {
            afterDestroy: async (application, opts) => {
                const where = {
                    ApplicationId: application.id
                }
                M.Device.update({ ApplicationId: null }, { where })
            }
        }
    },
    associations: function (M) {
        this.hasMany(M.Project)
        this.hasMany(M.Project, { as: 'Instances' })
        this.belongsTo(M.Team, { foreignKey: { allowNull: false } })
        this.hasMany(M.DeviceGroup, { onDelete: 'CASCADE' })
        this.hasMany(M.Device) // also via instance and device group
    },
    finders: function (M, app) {
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
                byTeam: async (teamIdOrHash, { includeInstances = false, includeApplicationDevices = false, includeInstanceStorageFlow = false, associationsLimit = null, includeApplicationSummary = false } = {}) => {
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

                        if (associationsLimit) {
                            include.limit = associationsLimit
                            include.order = [['updatedAt', 'DESC']]
                            include.attributes = {
                                include: [...include.attributes]
                            }
                        }

                        includes.push(include)
                    }

                    if (includeApplicationDevices) {
                        const include = {
                            model: M.Device,
                            attributes: ['hashid', 'id', 'name', 'links', 'state', 'mode', 'updatedAt', 'lastSeenAt', 'editorConnected', 'editorToken']
                        }

                        if (associationsLimit) {
                            include.limit = associationsLimit
                            include.order = [['lastSeenAt', 'DESC NULLS LAST'], ['updatedAt', 'DESC']]
                        }

                        includes.push(include)
                    }

                    const query = {
                        include: includes
                    }

                    if (includeApplicationSummary) {
                        query.attributes = {
                            include: [
                                [
                                    literal(`(
                                        SELECT COUNT(*)
                                        FROM "Projects" AS "Instances"
                                        WHERE "Instances"."ApplicationId" = "Application"."id"
                                    )`),
                                    'instanceCount'
                                ],
                                [
                                    literal(`(
                                        SELECT COUNT(*)
                                        FROM "Devices"
                                        WHERE "Devices"."ApplicationId" = "Application"."id"
                                    )`),
                                    'deviceCount'
                                ],
                                [
                                    literal(`(
                                        SELECT count(*)
                                        FROM "DeviceGroups"
                                        WHERE "DeviceGroups"."ApplicationId" = "Application"."id"
                                    )`),
                                    'deviceGroupCount'
                                ],
                                [
                                    literal(`(
                                        SELECT count(*)
                                        FROM "ProjectSnapshots"
                                        LEFT JOIN "Devices" ON "Devices"."id" = "ProjectSnapshots"."DeviceId"
                                        LEFT JOIN "Projects" ON "Projects"."id" = "ProjectSnapshots"."ProjectId"
                                        WHERE "Devices"."ApplicationId" = "Application"."id" OR "Projects"."ApplicationId" = "Application"."id"
                                    )`),
                                    'snapshotCount'
                                ]

                            ]
                        }

                        // Non-EE licensed instances might not have the Pipeline table
                        // You can add a license without a restart, so we also need to check if the Model is loaded
                        // If the model is loaded, it can be assumed the table exists
                        if (app.license.active() && app.db.models.Pipeline) {
                            query.attributes.include.push([
                                literal(`(
                                    SELECT count(*)
                                    FROM "Pipelines"
                                    WHERE "Pipelines"."ApplicationId" = "Application"."id"
                                )`),
                                'pipelineCount'
                            ])
                        }
                    }

                    return this.findAll(query)
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
