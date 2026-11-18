/**
 * A version of a data schema: the draft (no version number) or a published or deprecated version.
 * A published version is immutable apart from its notes and being deprecated or undeprecated.
 * @namespace forge.db.models.DataSchemaVersion
 */

const { DataTypes, Op, literal } = require('sequelize')

const { isValidVersion } = require('../../lib/schemas/version')

const STATUSES = ['draft', 'published', 'deprecated']

// Fields that cannot change once a version is published
const LOCKED_FIELDS = ['schema', 'version', 'major', 'minor', 'patch', 'format', 'DataSchemaId', 'PublishedById', 'publishedAt']

const ALLOWED_STATUS_CHANGES = {
    draft: ['published'],
    published: ['deprecated'],
    deprecated: ['published']
}

const NEWEST_FIRST = [['major', 'DESC'], ['minor', 'DESC'], ['patch', 'DESC']]

function versionError (message) {
    const err = new Error(message)
    err.code = 'invalid_schema_version'
    return err
}

module.exports = {
    name: 'DataSchemaVersion',
    schema: {
        version: {
            type: DataTypes.STRING,
            allowNull: true,
            set (value) {
                // major, minor and patch are set here rather than in a hook, so `update({ version })` saves them too
                this.setDataValue('version', value)
                const [major, minor, patch] = isValidVersion(value) ? value.split('.').map(Number) : [null, null, null]
                this.setDataValue('major', major)
                this.setDataValue('minor', minor)
                this.setDataValue('patch', patch)
            }
        },
        major: { type: DataTypes.INTEGER, allowNull: true },
        minor: { type: DataTypes.INTEGER, allowNull: true },
        patch: { type: DataTypes.INTEGER, allowNull: true },
        schema: {
            type: DataTypes.TEXT,
            allowNull: false,
            get () {
                const raw = this.getDataValue('schema')
                if (raw === undefined || raw === null) {
                    return raw
                }
                return JSON.parse(raw)
            },
            set (value) {
                // Always stored as JSON.stringify output, so saving the same content is not a change
                this.setDataValue('schema', JSON.stringify(value))
            }
        },
        format: { type: DataTypes.STRING, allowNull: false, defaultValue: 'json-schema-2020-12' },
        notes: { type: DataTypes.TEXT, allowNull: true },
        status: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: 'draft',
            validate: {
                isIn: { args: [STATUSES], msg: `Status must be one of ${STATUSES.join(', ')}` }
            }
        },
        publishedAt: { type: DataTypes.DATE, allowNull: true }
    },
    meta: {
        slug: false,
        links: false
    },
    associations: function (M) {
        this.belongsTo(M.DataSchema, { foreignKey: { allowNull: false }, onDelete: 'CASCADE' })
        this.belongsTo(M.User, { as: 'CreatedBy', foreignKey: { allowNull: true } })
        this.belongsTo(M.User, { as: 'PublishedBy', foreignKey: { allowNull: true } })
    },
    hooks: function (M) {
        return {
            beforeValidate: (row) => {
                if (row.status === 'draft') {
                    if (row.version !== null && row.version !== undefined) {
                        throw versionError('A draft cannot have a version')
                    }
                    return
                }
                if (!isValidVersion(row.version)) {
                    throw versionError('Version must be a plain major.minor.patch version')
                }
            },
            beforeUpdate: (row) => {
                // The status before this save, so publishing a draft can set the locked fields
                const previousStatus = row.previous('status')
                if (row.changed('status')) {
                    const allowed = ALLOWED_STATUS_CHANGES[previousStatus] || []
                    if (!allowed.includes(row.status)) {
                        throw versionError(`Cannot change a ${previousStatus} version to ${row.status}`)
                    }
                }
                if (previousStatus === 'published' || previousStatus === 'deprecated') {
                    const locked = LOCKED_FIELDS.filter(field => row.changed(field))
                    if (locked.length > 0) {
                        throw versionError(`Cannot change ${locked.join(', ')} of a ${previousStatus} version`)
                    }
                }
            },
            beforeBulkUpdate: (options) => {
                options.individualHooks = true
            },
            beforeDestroy: (row) => {
                if (row.status !== 'draft') {
                    throw versionError(`Cannot delete a ${row.status} version`)
                }
            },
            beforeBulkDestroy: (options) => {
                options.individualHooks = true
            }
        }
    },
    finders: function (M) {
        const userAttributes = ['hashid', 'id', 'username', 'name', 'avatar', 'admin', 'createdAt', 'suspended']
        const userIncludes = [
            { model: M.User, as: 'CreatedBy', attributes: userAttributes },
            { model: M.User, as: 'PublishedBy', attributes: userAttributes }
        ]
        return {
            static: {
                /**
                 * The newest published version, ignoring deprecated ones
                 * @param {number} schemaId
                 */
                latestPublished: async (schemaId, options = {}) => {
                    return this.findOne({
                        where: { DataSchemaId: schemaId, status: 'published' },
                        include: userIncludes,
                        order: NEWEST_FIRST,
                        transaction: options.transaction
                    })
                },
                /**
                 * Every version number in use, published or deprecated
                 * @param {number} schemaId
                 * @returns {Promise<string[]>}
                 */
                existingVersions: async (schemaId, options = {}) => {
                    const rows = await this.findAll({
                        where: { DataSchemaId: schemaId, status: { [Op.in]: ['published', 'deprecated'] } },
                        attributes: ['version'],
                        order: NEWEST_FIRST,
                        transaction: options.transaction
                    })
                    return rows.map(row => row.version)
                },
                /**
                 * A published or deprecated version
                 * @param {number} schemaId
                 * @param {string} version an exact version, or `latest` for the newest published version
                 */
                byVersion: async (schemaId, version, options = {}) => {
                    if (version === 'latest') {
                        return M.DataSchemaVersion.latestPublished(schemaId, options)
                    }
                    return this.findOne({
                        where: { DataSchemaId: schemaId, version, status: { [Op.in]: ['published', 'deprecated'] } },
                        include: userIncludes,
                        transaction: options.transaction
                    })
                },
                /**
                 * Every version of a schema: the draft first, then newest first
                 * @param {number} schemaId
                 * @param {{ status?: string }} filter
                 */
                forSchema: async (schemaId, filter = {}) => {
                    const where = { DataSchemaId: schemaId }
                    if (filter.status) {
                        where.status = filter.status
                    }
                    return this.findAll({
                        where,
                        include: userIncludes,
                        order: [
                            [literal('CASE WHEN "DataSchemaVersion"."status" = \'draft\' THEN 0 ELSE 1 END'), 'ASC'],
                            ...NEWEST_FIRST
                        ]
                    })
                }
            }
        }
    }
}
