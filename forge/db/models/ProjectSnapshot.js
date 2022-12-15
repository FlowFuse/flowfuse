/**
 * A Project Snapshot definition
 * @namespace forge.db.models.ProjectSnapshot
 */
const { DataTypes, Op } = require('sequelize')

module.exports = {
    name: 'ProjectSnapshot',
    schema: {
        name: { type: DataTypes.STRING, allowNull: false },
        description: { type: DataTypes.TEXT, allowNull: true, default: '' },
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
        this.hasMany(M.Device, { foreignKey: 'targetSnapshotId' })
        this.hasMany(M.Device, { foreignKey: 'activeSnapshotId' })
    },
    finders: function (M) {
        const self = this
        return {
            static: {
                byId: async function (id) {
                    // This returns the full snapshot - including settings and flows
                    // This should _only_ be used when getting all of that information
                    if (typeof id === 'string') {
                        id = M.ProjectSnapshot.decodeHashid(id)
                    }
                    return self.findOne({
                        where: { id }
                    })
                },
                forProject: async (projectId, pagination = {}) => {
                    const limit = parseInt(pagination.limit) || 1000
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
                        attributes: ['hashid', 'id', 'name', 'description', 'createdAt', 'updatedAt'],
                        include: {
                            model: M.User,
                            attributes: ['hashid', 'id', 'username', 'avatar']
                        }
                    })
                    return {
                        meta: {
                            next_cursor: rows.length === limit ? rows[rows.length - 1].hashid : undefined
                        },
                        count,
                        snapshots: rows
                    }
                }
            }
        }
    }
}
