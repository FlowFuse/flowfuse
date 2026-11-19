/**
 * A data schema in a team's schema registry. Its content lives in its versions:
 * at most one draft, and any number of published or deprecated versions.
 * @namespace forge.db.models.DataSchema
 */

const { DataTypes, literal } = require('sequelize')

const { buildPaginationSearchClause } = require('../utils')

const nameValidator = { msg: 'Schema name cannot be empty' }

const LATEST_PUBLISHED = `
    FROM "DataSchemaVersions" AS "version"
    WHERE "version"."DataSchemaId" = "DataSchema"."id" AND "version"."status" = 'published'
    ORDER BY "version"."major" DESC, "version"."minor" DESC, "version"."patch" DESC
    LIMIT 1`

const summaryAttributes = {
    include: [
        [literal(`(SELECT "version"."version" ${LATEST_PUBLISHED})`), 'latestVersion'],
        [literal(`(SELECT "version"."publishedAt" ${LATEST_PUBLISHED})`), 'latestPublishedAt'],
        [literal(`(
            SELECT COUNT(*)
            FROM "DataSchemaVersions" AS "draft"
            WHERE "draft"."DataSchemaId" = "DataSchema"."id" AND "draft"."status" = 'draft'
        )`), 'draftCount']
    ]
}

module.exports = {
    name: 'DataSchema',
    schema: {
        name: {
            type: DataTypes.STRING,
            allowNull: false,
            set (value) {
                this.setDataValue('name', typeof value === 'string' ? value.trim() : value)
            },
            validate: {
                notEmpty: nameValidator,
                notNull: nameValidator,
                len: { args: [1, 255], msg: 'Schema name must be at most 255 characters' }
            }
        },
        description: { type: DataTypes.TEXT, allowNull: true }
    },
    meta: {
        slug: false,
        links: false
    },
    associations: function (M) {
        this.belongsTo(M.Team, { foreignKey: { allowNull: false }, onDelete: 'CASCADE' })
        this.belongsTo(M.DataSchemaGroup, { foreignKey: { allowNull: true }, onDelete: 'SET NULL' })
        this.hasMany(M.DataSchemaVersion)
    },
    hooks: function (M) {
        return {
            beforeSave: async (schema, options) => {
                if (schema.DataSchemaGroupId === null || schema.DataSchemaGroupId === undefined) {
                    return
                }
                if (!schema.changed('DataSchemaGroupId') && !schema.changed('TeamId')) {
                    return
                }
                const group = await M.DataSchemaGroup.findByPk(schema.DataSchemaGroupId, {
                    attributes: ['id', 'TeamId'],
                    transaction: options.transaction
                })
                if (!group || group.TeamId !== schema.TeamId) {
                    throw new Error('The schema group does not belong to this team')
                }
            },
            beforeBulkUpdate: (options) => {
                options.individualHooks = true
            }
        }
    },
    finders: function (M) {
        const groupInclude = { model: M.DataSchemaGroup, attributes: ['hashid', 'id', 'name'] }
        return {
            static: {
                byId: async (id) => {
                    if (typeof id === 'string') {
                        [id] = M.DataSchema.decodeHashid(id) || []
                        if (id === undefined) {
                            return null
                        }
                    }
                    return this.findOne({
                        where: { id },
                        include: [groupInclude],
                        attributes: summaryAttributes
                    })
                },
                byName: async (teamId, name) => {
                    return this.findOne({
                        where: { TeamId: teamId, name },
                        include: [groupInclude],
                        attributes: summaryAttributes
                    })
                },
                /**
                 * The team's schemas, paginated
                 * @param {number} teamId
                 * @param {{ cursor?: string, limit?: number, query?: string }} pagination
                 * @param {{ groupId?: number | null }} filter `groupId: null` for schemas without a group
                 */
                forTeam: async (teamId, pagination = {}, filter = {}) => {
                    const limit = Math.min(parseInt(pagination.limit) || 100, 100)
                    const params = { ...pagination }
                    if (params.cursor) {
                        params.cursor = M.DataSchema.decodeCursor(params.cursor)
                    }
                    const where = { TeamId: teamId }
                    if (filter.groupId !== undefined) {
                        where.DataSchemaGroupId = filter.groupId
                    }
                    const [rows, count] = await Promise.all([
                        this.findAll({
                            where: buildPaginationSearchClause(params, where, ['DataSchema.name', 'DataSchema.description']),
                            include: [groupInclude],
                            attributes: summaryAttributes,
                            order: [['id', 'ASC']],
                            limit
                        }),
                        this.count({ where: buildPaginationSearchClause({ query: params.query }, where, ['DataSchema.name', 'DataSchema.description']) })
                    ])
                    return {
                        meta: {
                            next_cursor: rows.length === limit ? rows[rows.length - 1].hashid : undefined
                        },
                        count,
                        schemas: rows
                    }
                }
            },
            instance: {
                getDraft: async function (options = {}) {
                    return M.DataSchemaVersion.findOne({
                        where: { DataSchemaId: this.id, status: 'draft' },
                        transaction: options.transaction
                    })
                },
                getLatestPublished: async function (options = {}) {
                    return M.DataSchemaVersion.latestPublished(this.id, options)
                }
            }
        }
    }
}
