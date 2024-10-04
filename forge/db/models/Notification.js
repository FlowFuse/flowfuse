/**
 * An user notification
 */

const { DataTypes, Op } = require('sequelize')

const { buildPaginationSearchClause } = require('../utils')

module.exports = {
    name: 'Notification',
    schema: {
        type: { type: DataTypes.STRING, allowNull: false },
        reference: { type: DataTypes.STRING, allowNull: true },
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
                            UserId: user.id
                        }
                    })
                },
                byReference: async (reference, user) => {
                    return this.findOne({
                        where: {
                            reference,
                            UserId: user.id
                        },
                        order: [['id', 'DESC']]
                    })
                },
                forUser: async (user, pagination = {}) => {
                    const limit = parseInt(pagination.limit) || 100
                    const where = {
                        UserId: user.id
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
                },
                updateNotificationState: async ({ read = true, ids = [] }, user) => {
                    if (ids.length === 0) {
                        return
                    }

                    ids = ids.map(id => typeof id === 'string'
                        ? M.Notification.decodeHashid(id)?.[0]
                        : id)

                    await M.Notification.update(
                        { read: read ? 1 : 0 },
                        {
                            where: {
                                id: ids.filter(e => e),
                                UserId: user.id
                            }
                        }
                    )
                }
            }
        }
    },
    meta: {
        slug: false,
        links: false
    }
}
