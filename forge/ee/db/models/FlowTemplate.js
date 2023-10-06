/**
 * A Flow Template definition
 */
const { DataTypes } = require('sequelize')

const { buildPaginationSearchClause } = require('../../../db/utils')

module.exports = {
    name: 'FlowTemplate',
    schema: {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        name: { type: DataTypes.STRING, allowNull: false },
        active: { type: DataTypes.BOOLEAN, defaultValue: true },
        description: { type: DataTypes.TEXT, defaultValue: '' },
        category: { type: DataTypes.STRING, defaultValue: '' },
        flows: {
            type: DataTypes.TEXT,
            set (value) {
                this.setDataValue('flows', JSON.stringify(value))
            },
            get () {
                const rawValue = this.getDataValue('flows') || '{}'
                return JSON.parse(rawValue)
            }
        },
        modules: {
            type: DataTypes.TEXT,
            set (value) {
                this.setDataValue('modules', JSON.stringify(value))
            },
            get () {
                const rawValue = this.getDataValue('modules') || '{}'
                return JSON.parse(rawValue)
            }
        }
    },
    associations: function (M) {
        this.belongsTo(M.User, { as: 'createdBy' })
    },
    finders: function (M) {
        const self = this
        return {
            static: {
                byId: async function (id) {
                    if (typeof id === 'string') {
                        id = M.FlowTemplate.decodeHashid(id)
                    }
                    return self.findOne({
                        where: { id },
                        include: [
                            { model: M.User, as: 'createdBy' }
                        ]
                    })
                },
                getAll: async (pagination = {}, where = {}) => {
                    const limit = parseInt(pagination.limit) || 1000
                    if (pagination.cursor) {
                        pagination.cursor = M.FlowTemplate.decodeHashid(pagination.cursor)
                    }

                    const [rows, count] = await Promise.all([
                        this.findAll({
                            where: buildPaginationSearchClause(pagination, where, ['FlowTemplate.name']),
                            order: [['id', 'ASC']],
                            limit,
                            include: [
                                { model: M.User, as: 'createdBy' }
                            ]
                        }),
                        this.count({ where })
                    ])
                    return {
                        meta: {
                            next_cursor: rows.length === limit ? rows[rows.length - 1].hashid : undefined
                        },
                        count,
                        templates: rows
                    }
                }
            }
        }
    }
}
