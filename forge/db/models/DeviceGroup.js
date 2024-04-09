/**
 * A DeviceGroup.
 * A logical grouping of devices for the primary intent of group deployments in the pipeline stages.
 * @namespace forge.db.models.DeviceGroup
 */

const { DataTypes, literal } = require('sequelize')

const { buildPaginationSearchClause } = require('../utils')
const nameValidator = { msg: 'Device Group name cannot be empty' }

module.exports = {
    name: 'DeviceGroup',
    schema: {
        name: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                notEmpty: nameValidator,
                notNull: nameValidator
            }
        },
        description: { type: DataTypes.TEXT },
        targetSnapshotId: { type: DataTypes.INTEGER, allowNull: true }
    },
    associations: function (M) {
        this.belongsTo(M.Application, { onDelete: 'CASCADE' })
        this.belongsTo(M.ProjectSnapshot, { as: 'targetSnapshot' })
        this.hasMany(M.Device)
    },
    finders: function (M) {
        const self = this
        const deviceCountLiteral = literal(`(
            SELECT COUNT(*)
            FROM "Devices" AS "device"
            WHERE
            "device"."DeviceGroupId" = "DeviceGroup"."id"
            AND
            "device"."ApplicationId" = "DeviceGroup"."ApplicationId"    
        )`)
        return {
            static: {
                byId: async function (id) {
                    if (typeof id === 'string') {
                        id = M.DeviceGroup.decodeHashid(id)
                    }
                    // find one, include application, devices and device count
                    return self.findOne({
                        where: { id },
                        include: [
                            { model: M.Application, attributes: ['hashid', 'id', 'name', 'TeamId'] },
                            {
                                model: M.Device,
                                attributes: ['hashid', 'id', 'name', 'type', 'TeamId', 'ApplicationId', 'ProjectId', 'ownerType'],
                                where: {
                                    ApplicationId: literal('"Devices"."ApplicationId" = "Application"."id"')
                                },
                                required: false
                            },
                            {
                                model: M.ProjectSnapshot,
                                as: 'targetSnapshot',
                                attributes: ['hashid', 'id', 'name']
                            }
                        ],
                        attributes: {
                            include: [
                                [
                                    deviceCountLiteral,
                                    'deviceCount'
                                ]
                            ]
                        }
                    })
                },
                getAll: async (pagination = {}, where = {}) => {
                    const limit = parseInt(pagination.limit) || 1000
                    if (pagination.cursor) {
                        pagination.cursor = M.DeviceGroup.decodeHashid(pagination.cursor)
                    }
                    if (where.ApplicationId && typeof where.ApplicationId === 'string') {
                        where.ApplicationId = M.Application.decodeHashid(where.ApplicationId)
                    }
                    const [rows, count] = await Promise.all([
                        this.findAll({
                            where: buildPaginationSearchClause(pagination, where, ['DeviceGroup.name', 'DeviceGroup.description']),
                            include: [
                                {
                                    model: M.ProjectSnapshot,
                                    as: 'targetSnapshot',
                                    attributes: ['hashid', 'id', 'name']
                                }
                            ],
                            attributes: {
                                include: [
                                    [
                                        deviceCountLiteral,
                                        'deviceCount'
                                    ]
                                ]
                            },
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
                        groups: rows
                    }
                }
            },
            instance: {
                deviceCount: async function () {
                    return await M.Device.count({ where: { DeviceGroupId: this.id, ApplicationId: this.ApplicationId } })
                },
                getDevices: async function () {
                    return await M.Device.findAll({
                        where: {
                            DeviceGroupId: this.id,
                            ApplicationId: this.ApplicationId
                        }
                    })
                }
            }
        }
    }
}
