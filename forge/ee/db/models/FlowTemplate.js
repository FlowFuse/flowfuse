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
        order: { type: DataTypes.INTEGER, defaultValue: 0 },
        default: { type: DataTypes.BOOLEAN, defaultValue: false },
        icon: { type: DataTypes.STRING, allowNull: true },
        flows: {
            type: DataTypes.TEXT,
            validate: {
                isValidFlow (value) {
                    if (value) {
                        let parsedValue
                        try {
                            parsedValue = JSON.parse(value)
                        } catch (err) {
                            throw new Error('Invalid flow json')
                        }
                        if (!parsedValue.flows) {
                            throw new Error('Flow json missing \'flows\' property')
                        }
                        if (!Array.isArray(parsedValue.flows)) {
                            throw new Error('Flow json \'flows\' property not an Array')
                        }
                        // .credentials are optional, but if present, must be an object
                        // and not appear encrypted
                        if (parsedValue.credentials) {
                            if (typeof parsedValue.credentials !== 'object' || Array.isArray(parsedValue.credentials)) {
                                throw new Error('Flow json \'credentials\' property must be an object')
                            }
                            if (parsedValue.credentials.$) {
                                throw new Error('Flow json \'credentials\' property must not be encrypted - found $ property')
                            }
                        }
                    }
                }
            },
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
        },
        // The teamTypeScope column is a JSON array that contains a the teamtype id to signify which teamtypes this template is available on
        // a null value signifies that the template is available to all teamtypes (current and future ones)
        teamTypeScope: {
            type: DataTypes.TEXT,
            defaultValue: null,
            set (value) {
                this.setDataValue('teamTypeScope', value ? JSON.stringify(value) : null)
            },
            get () {
                const rawValue = this.getDataValue('teamTypeScope') || null
                return JSON.parse(rawValue)
            }
        }
    },
    hooks: {
        afterValidate (flowTemplate, options) {
            if (flowTemplate.changed('default') && flowTemplate.default === true) {
                return this.update({
                    default: false
                }, {
                    where: {
                        default: true
                    }
                })
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
                        try {
                            id = M.FlowTemplate.decodeHashid(id)
                        } catch (err) {
                            return null
                        }
                    }
                    return self.findOne({
                        where: { id },
                        include: [
                            { model: M.User, as: 'createdBy' }
                        ]
                    })
                },
                forTeamType: async (teamTypeId, pagination, where = {}) => {
                    // since sqlite does not support json queries, we have to get all rows and filter them in memory
                    if (typeof teamTypeId === 'string') {
                        teamTypeId = M.TeamType.decodeHashid(teamTypeId)
                    }
                    const data = await self.getAll(pagination, where)
                    const rows = data.templates.filter(template => {
                        if (!template.teamTypeScope) {
                            return true // by default (null), all templates are available to all teamtypes
                        }
                        return template.teamTypeScope.includes(teamTypeId)
                    })
                    data.templates = rows
                    data.count = rows.length
                    return data
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
