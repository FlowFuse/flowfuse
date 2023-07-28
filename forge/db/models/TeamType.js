/**
 * A Team
 * @namespace forge.db.models.Team
 */

const { DataTypes, literal } = require('sequelize')

const { buildPaginationSearchClause } = require('../utils')

module.exports = {
    name: 'TeamType',
    schema: {
        name: { type: DataTypes.STRING, allowNull: false },
        active: { type: DataTypes.BOOLEAN, defaultValue: true },
        order: { type: DataTypes.INTEGER, defaultValue: 0 },
        description: { type: DataTypes.TEXT },
        properties: {
            type: DataTypes.TEXT,
            set (value) {
                this.setDataValue('properties', JSON.stringify(value))
            },
            get () {
                const rawValue = this.getDataValue('properties') || '{}'
                return JSON.parse(rawValue)
            }
        }
    },
    associations: function (M) {
        this.hasMany(M.Team)
    },
    hooks: {
        beforeDestroy: async (teamType, opts) => {
            const teamCount = await teamType.teamCount()
            if (teamCount > 0) {
                throw new Error('Cannot delete TeamType that is used by teams')
            }
        }
    },
    finders: function (M) {
        const self = this
        return {
            static: {
                byId: async function (id) {
                    if (typeof id === 'string') {
                        id = M.TeamType.decodeHashid(id)
                    }
                    return self.findOne({
                        where: { id },
                        attributes: {
                            include: [
                                [
                                    literal(`(
                                        SELECT COUNT(*)
                                        FROM "Teams" AS "team"
                                        WHERE
                                        "team"."TeamTypeId" = "TeamType"."id"
                                    )`),
                                    'teamCount'
                                ]
                            ]
                        }
                    })
                },
                byName: async function (name) {
                    return self.findOne({
                        where: { name },
                        attributes: {
                            include: [
                                [
                                    literal(`(
                                        SELECT COUNT(*)
                                        FROM "Teams" AS "team"
                                        WHERE
                                        "team"."TeamTypeId" = "TeamType"."id"
                                    )`),
                                    'teamCount'
                                ]
                            ]
                        }
                    })
                },
                getAll: async (pagination = {}, where = {}) => {
                    const limit = parseInt(pagination.limit) || 1000
                    if (pagination.cursor) {
                        pagination.cursor = M.TeamType.decodeHashid(pagination.cursor)
                    }

                    const [rows, count] = await Promise.all([
                        this.findAll({
                            where: buildPaginationSearchClause(pagination, where, ['TeamType.name', 'TeamType.description']),
                            order: [['id', 'ASC']],
                            limit,
                            attributes: {
                                include: [
                                    [
                                        literal(`(
                                            SELECT COUNT(*)
                                            FROM "Teams" AS "team"
                                            WHERE
                                            "team"."TeamTypeId" = "TeamType"."id"
                                        )`),
                                        'teamCount'
                                    ]
                                ]
                            }
                        }),
                        this.count({ where })
                    ])
                    return {
                        meta: {
                            next_cursor: rows.length === limit ? rows[rows.length - 1].hashid : undefined
                        },
                        count,
                        types: rows
                    }
                }
            },
            instance: {
                getProperty: function (key, defaultValue) {
                    const parts = key.split('.')
                    if (!this.properties) {
                        return defaultValue
                    }
                    let props = this.properties
                    while (parts.length > 0) {
                        const k = parts.shift()
                        if (Object.hasOwn(props, k)) {
                            if (parts.length > 0) {
                                props = props[k]
                            } else {
                                return props[k]
                            }
                        } else {
                            return defaultValue
                        }
                    }
                    return defaultValue
                },
                teamCount: async function () {
                    return M.Team.count({ where: { TeamTypeId: this.id } })
                },
                getInstanceTypeProperty: function (instanceType, property, defaultValue) {
                    // instanceType can be:
                    // - number (raw id)
                    // - string (a hashid)
                    // - a full ProjectType object
                    // We need the hashid as that is what is used as the key in the
                    // properties object
                    if (typeof instanceType === 'number') {
                        // Raw id
                        instanceType = M.ProjectType.encodeHashid(instanceType)
                    } else if (instanceType.hashid) {
                        // Full ProjectType object
                        instanceType = instanceType.hashid
                    }
                    return this.getProperty(`instances.${instanceType}.${property}`, defaultValue)
                }
            }
        }
    }
}
