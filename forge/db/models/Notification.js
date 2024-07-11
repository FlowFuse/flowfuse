/**
 * An user notification
 */

const { DataTypes, Op } = require('sequelize')

const { buildPaginationSearchClause } = require('../utils')

module.exports = {
    name: 'Notification',
    schema: {
        type: { type: DataTypes.STRING, allowNull: false },
        read: { type: DataTypes.BOOLEAN, defaultValue: false },
        data: {
            type: DataTypes.TEXT,
            get () {
                const rawValue = this.getDataValue('data')
                if (rawValue === undefined || rawValue === null) {
                    return {}
                }
                return JSON.parse(rawValue)
            },
            set (value) {
                this.setDataValue('data', JSON.stringify(value))
            }
        }
    },
    options: {
        updatedAt: false
    },
    associations: function (M) {
        this.belongsTo(M.User, {
            onDelete: 'CASCADE'
        })
    },
    finders: function (M) {
        return {
            static: {
                byId: async (id, user) => {
                    if (typeof id === 'string') {
                        id = M.Notification.decodeHashid(id)
                    }
                    return this.findOne({
                        where: {
                            id,
                            userId: user.id
                        }
                    })
                },
                forUser: async (user, pagination = {}) => {
                    const limit = parseInt(pagination.limit) || 100
                    const where = {
                        userId: user.id
                    }
                    if (pagination.cursor) {
                        // As we aren't using the default cursor behaviour (Op.gt)
                        // set the appropriate clause and delete cursor so that
                        // buildPaginationSearchClause doesn't do it for us
                        where.id = { [Op.lt]: M.Notification.decodeHashid(pagination.cursor) }
                        delete pagination.cursor
                    }
                    const { count, rows } = await this.findAndCountAll({
                        where: buildPaginationSearchClause(
                            pagination,
                            where
                        ),
                        order: [['id', 'DESC']],
                        include: {
                            model: M.User,
                            attributes: ['id', 'hashid', 'username']
                        },
                        limit
                    })

                    return {
                        meta: {
                            next_cursor: rows.length === limit ? rows[rows.length - 1].hashid : undefined
                        },
                        count,
                        notifications: rows
                    }
                }
            }
        }
    },
    meta: {
        slug: false,
        links: false
    }
}
