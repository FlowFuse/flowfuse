/**
 * A Project Snapshot definition
 * @namespace forge.db.models.ProjectSnapshot
 */
const { DataTypes, Op } = require('sequelize')

module.exports = {
    name: 'ProjectSnapshot',
    schema: {
        name: { type: DataTypes.STRING, allowNull: false, unique: true },
        settings: {
            type: DataTypes.TEXT,
            set (value) {
                this.setDataValue('settings', JSON.stringify(value))
            },
            get () {
                const rawValue = this.getDataValue('settings') || '{}'
                return JSON.parse(rawValue)
            }
        },
        flows: {
            type: DataTypes.TEXT,
            set (value) {
                this.setDataValue('flows', JSON.stringify(value))
            },
            get () {
                const rawValue = this.getDataValue('flows') || '{}'
                return JSON.parse(rawValue)
            }
        }
    },
    meta: {
        links: false
    },
    associations: function (M) {
        this.belongsTo(M.Project)
        this.belongsTo(M.User)
    },
    finders: function (M) {
        const self = this
        return {
            static: {
                byId: async function (id) {
                    if (typeof id === 'string') {
                        id = M.ProjectSnapshot.decodeHashid(id)
                    }
                    return self.findOne({
                        where: { id }
                    })
                },
                forProject: async (projectId, pagination = {}) => {
                    const limit = parseInt(pagination.limit) || 30
                    const where = {
                        ProjectId: projectId
                    }
                    if (pagination.cursor) {
                        where.id = { [Op.lt]: M.ProjectSnapshot.decodeHashid(pagination.cursor) }
                    }
                    const { count, rows } = await this.findAndCountAll({
                        where,
                        order: [['id', 'DESC']],
                        limit,
                        attributes: ['hashid', 'id', 'name', 'createdAt', 'updatedAt'],
                        include: {
                            model: M.User,
                            attributes: ['hashid', 'id', 'username', 'avatar']
                        }
                    })
                    return {
                        meta: {
                            next_cursor: rows.length === limit ? rows[rows.length - 1].hashid : undefined
                        },
                        count: count,
                        snapshots: rows
                    }
                }
            }
        }
    }
}
