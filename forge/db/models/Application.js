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
                byTeam: async (teamIdOrHash, { includeInstances = false, includeApplicationDevices = false, includeInstanceStorageFlow = false, associationsLimit = null } = {}) => {
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
                            include.order = [['mostRecentAuditLogCreatedAt', 'DESC'], ['updatedAt', 'DESC']]
                            include.attributes = {
                                include: [...include.attributes, [
                                    literal(`(
                                        SELECT createdAt
                                        FROM "AuditLogs"
                                        WHERE "AuditLogs"."entityId" = "project"."id"
                                        AND "AuditLogs"."entityType" = 'project'
                                        ORDER BY "createdAt" DESC
                                        LIMIT 1
                                    )`),
                                    'mostRecentAuditLogCreatedAt'
                                ], [
                                    literal(`(
                                        SELECT event
                                        FROM "AuditLogs"
                                        WHERE "AuditLogs"."entityId" = "project"."id"
                                        AND "AuditLogs"."entityType" = 'project'
                                        ORDER BY "createdAt" DESC
                                        LIMIT 1
                                    )`),
                                    'mostRecentAuditLogEvent'
                                ]]
                            }
                        }

                        includes.push(include)
                    }

                    if (includeApplicationDevices) {
                        const include = {
                            model: M.Device,
                            attributes: ['hashid', 'id', 'name', 'links', 'state', 'updatedAt']
                        }

                        if (associationsLimit) {
                            include.limit = associationsLimit
                            include.order = [['mostRecentAuditLogCreatedAt', 'DESC'], ['updatedAt', 'DESC']]
                            include.attributes = {
                                include: [...include.attributes, [
                                    literal(`(
                                        SELECT createdAt
                                        FROM "AuditLogs"
                                        WHERE "AuditLogs"."entityId" = "device"."id"
                                        AND "AuditLogs"."entityType" = 'device'
                                        ORDER BY "createdAt" DESC
                                        LIMIT 1
                                    )`),
                                    'mostRecentAuditLogCreatedAt'
                                ], [
                                    literal(`(
                                        SELECT event
                                        FROM "AuditLogs"
                                        WHERE "AuditLogs"."entityId" = "device"."id"
                                        AND "AuditLogs"."entityType" = 'device'
                                        ORDER BY "createdAt" DESC
                                        LIMIT 1
                                    )`),
                                    'mostRecentAuditLogEvent'
                                ]]
                            }
                        }

                        includes.push(include)
                    }

                    const query = {
                        include: includes
                    }

                    if (associationsLimit) {
                        query.attributes = {
                            include: [
                                [
                                    literal(`(
                                        SELECT COUNT(*)
                                        FROM "Projects" AS "instance"
                                        WHERE
                                        "instance"."ApplicationId" = "Application"."id"
                                    )`),
                                    'instanceCount'
                                ],
                                [
                                    literal(`(
                                        SELECT COUNT(*)
                                        FROM "Devices" AS "device"
                                        WHERE
                                        "device"."ApplicationId" = "Application"."id"
                                    )`),
                                    'deviceCount'
                                ]
                            ]
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
