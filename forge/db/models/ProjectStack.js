/**
 * A Project Stack definition
 * @namespace forge.db.models.ProjectStack
 */
const { DataTypes, literal } = require('sequelize')
const { buildPaginationSearchClause } = require('../utils')

module.exports = {
    name: 'ProjectStack',
    schema: {
        name: { type: DataTypes.STRING, allowNull: false, unique: true },
        label: { type: DataTypes.STRING },
        active: { type: DataTypes.BOOLEAN, defaultValue: true },
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
        links: 'stacks'
    },
    associations: function (M) {
        this.hasMany(M.Project)
        this.hasOne(this, { foreignKey: 'replacedBy' })
        this.belongsTo(M.ProjectType)
    },
    hooks: function (M) {
        return {
            beforeDestroy: async (stack, opts) => {
                const projectCount = await stack.projectCount()
                if (projectCount > 0) {
                    throw new Error('Cannot delete stack that is used by projects')
                }
                const replacedByCount = await M.ProjectStack.count({ where: { replacedBy: stack.id } })
                if (replacedByCount > 0) {
                    throw new Error('Cannot delete stack that is the latest version of an active stack')
                }
            }
        }
    },
    finders: function (M) {
        const self = this
        return {
            static: {
                byId: async function (id) {
                    if (typeof id === 'string') {
                        id = M.ProjectStack.decodeHashid(id)
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
                                        "project"."ProjectStackId" = "ProjectStack"."id"
                                    )`),
                                    'projectCount'
                                ]
                            ]
                        }
                    })
                },
                getAll: async (pagination = {}, where = {}) => {
                    const limit = parseInt(pagination.limit) || 30
                    if (pagination.cursor) {
                        pagination.cursor = M.ProjectStack.decodeHashid(pagination.cursor)
                    }
                    const [rows, count] = await Promise.all([
                        await this.findAll({
                            where: buildPaginationSearchClause(pagination, where, ['ProjectStack.name']),
                            order: [['id', 'ASC']],
                            limit,
                            attributes: {
                                include: [
                                    [
                                        literal(`(
                                            SELECT COUNT(*)
                                            FROM "Projects" AS "project"
                                            WHERE
                                            "project"."ProjectStackId" = "ProjectStack"."id"
                                        )`),
                                        'projectCount'
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
                        stacks: rows
                    }
                }
            },
            instance: {
                projectCount: async function () {
                    return await M.Project.count({ where: { ProjectStackId: this.id } })
                }
            }
        }
    }
}
