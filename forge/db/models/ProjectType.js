/**
 * A Project Type definition
 * @namespace forge.db.models.ProjectType
 */
const { DataTypes, literal } = require('sequelize')
const { buildPaginationSearchClause } = require('../utils')

module.exports = {
    name: 'ProjectType',
    schema: {
        name: { type: DataTypes.STRING, allowNull: false, unique: true },
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
    meta: {
        links: 'project-types'
    },
    associations: function (M) {
        this.hasMany(M.Project)
        this.hasMany(M.ProjectStack)
        this.belongsTo(M.ProjectStack, { as: 'defaultStack', constraints: false })
    },
    hooks: {
        beforeDestroy: async (projectType, opts) => {
            const projectCount = await projectType.projectCount()
            if (projectCount > 0) {
                throw new Error('Cannot delete ProjectType that is used by projects')
            }
        }
    },
    finders: function (M) {
        const self = this
        return {
            static: {
                byId: async function (id) {
                    if (typeof id === 'string') {
                        id = M.ProjectType.decodeHashid(id)
                    }
                    return self.findOne({
                        where: { id },
                        attributes: {
                            include: [
                                [
                                    literal(`(
                                         SELECT COUNT(*)
                                         FROM "Projects" AS "project"
                                         WHERE
                                         "project"."ProjectTypeId" = "ProjectType"."id"
                                     )`),
                                    'projectCount'
                                ],
                                [
                                    literal(`(
                                         SELECT COUNT(*)
                                         FROM "ProjectStacks" AS "stack"
                                         WHERE
                                         "stack"."ProjectTypeId" = "ProjectType"."id"
                                         AND
                                         "stack"."active" = TRUE
                                     )`),
                                    'stackCount'
                                ]
                            ]
                        }
                    })
                },
                getAll: async (pagination = {}, where = {}) => {
                    const limit = parseInt(pagination.limit) || 1000

                    if (pagination.cursor) {
                        pagination.cursor = M.ProjectType.decodeHashid(pagination.cursor)
                    }
                    const [rows, count] = await Promise.all([
                        this.findAll({
                            where: buildPaginationSearchClause(pagination, where, ['ProjectType.name', 'ProjectType.description']),
                            order: [['id', 'ASC']],
                            limit,
                            attributes: {
                                include: [
                                    [
                                        literal(`(
                                            SELECT COUNT(*)
                                            FROM "Projects" AS "project"
                                            WHERE
                                            "project"."ProjectTypeId" = "ProjectType"."id"
                                        )`),
                                        'projectCount'
                                    ],
                                    [
                                        literal(`(
                                            SELECT COUNT(*)
                                            FROM "ProjectStacks" AS "stack"
                                            WHERE
                                            "stack"."ProjectTypeId" = "ProjectType"."id"
                                            AND
                                            "stack"."active" = TRUE
                                        )`),
                                        'stackCount'
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
                projectCount: async function () {
                    return await M.Project.count({ where: { ProjectTypeId: this.id } })
                }
            }
        }
    }
}
