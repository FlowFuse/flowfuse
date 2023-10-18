/**
 * A Team
 * @namespace forge.db.models.TagType
 */

const { DataTypes, literal } = require('sequelize')

const { buildPaginationSearchClause } = require('../utils')

module.exports = {
    name: 'TagType',
    schema: {
        name: { type: DataTypes.STRING, allowNull: false },
        description: { type: DataTypes.TEXT },
        model: { type: DataTypes.STRING, allowNull: false },
        // schema: { // FUTURE
        //     type: DataTypes.TEXT,
        //     set (value) {
        //         this.setDataValue('schema', JSON.stringify(value))
        //     },
        //     get () {
        //         const rawValue = this.getDataValue('schema') || '{}'
        //         return JSON.parse(rawValue)
        //     }
        // }
        // add virtual columns for color and icon (these are not stored in the database at this time)
        color: {
            type: DataTypes.VIRTUAL,
            get () {
                return getDefaultColor(this.model)
            }
        },
        icon: {
            type: DataTypes.VIRTUAL,
            get () {
                return getDefaultIcon(this.model)
            }
        }
    },
    associations: function (M) {
        // Add 'TagType' foreign key to permit one-to-many relationship between Tag and TagType
        // NOTE: Sequelize will automatically create this column for us.
        // SEE: forge/db/models/Tag.js for the other side of this relationship
        this.hasMany(M.Tag)
    },
    hooks: {
        beforeDestroy: async (TagType, opts) => {
            const usageCount = await TagType.countTags()
            if (usageCount > 0) {
                throw new Error('Cannot delete TagType that is used by Tags')
            }
        }
    },
    finders: function (M) {
        const self = this
        return {
            static: {
                getDefaultColor,
                getDefaultIcon,
                byId: async function (id) {
                    if (typeof id === 'string') {
                        id = M.TagType.decodeHashid(id)
                    }
                    return self.findOne({
                        where: { id },
                        attributes: {
                            include: [
                                [
                                    literal(`(
                                        SELECT COUNT(*)
                                        FROM "Tags" AS "tag"
                                        WHERE
                                        "tag"."TagTypeId" = "TagType"."id"
                                    )`),
                                    'tagCount'
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
                                        FROM "Tags" AS "tag"
                                        WHERE
                                        "tag"."TagTypeId" = "TagType"."id"
                                    )`),
                                    'tagCount'
                                ]
                            ]
                        }
                    })
                },
                getAll: async (pagination = {}, where = {}) => {
                    const limit = parseInt(pagination.limit) || 1000
                    if (pagination.cursor) {
                        pagination.cursor = M.TagType.decodeHashid(pagination.cursor)
                    }

                    const [rows, count] = await Promise.all([
                        this.findAll({
                            where: buildPaginationSearchClause(pagination, where, ['TagType.name', 'TagType.description']),
                            order: [['id', 'ASC']],
                            limit
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
            }
        }
    }
}

function getDefaultIcon (model) {
    switch (model) {
    case 'device':
        return 'chip'
    default:
        return 'tag'
    }
}

function getDefaultColor (model) {
    switch (model) {
    case 'device':
        return 'blue'
    default:
        return 'gray'
    }
}
