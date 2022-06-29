/**
 * A Project Stack definition
 * @namespace forge.db.models.ProjectStack
 */
const { DataTypes, literal, Op } = require('sequelize')

module.exports = {
    name: 'ProjectStack',
    schema: {
        name: { type: DataTypes.STRING, allowNull: false, unique: true },
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
                    throw new Error('Cannot delete stack is active replacing another stack')
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
                        where.id = { [Op.gt]: M.ProjectStack.decodeHashid(pagination.cursor) }
                    }
                    const { count, rows } = await this.findAndCountAll({
                        where,
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
                    })
                    return {
                        meta: {
                            next_cursor: rows.length === limit ? rows[rows.length - 1].hashid : undefined
                        },
                        count: count,
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
