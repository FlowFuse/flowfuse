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

function versionParts (version) {
    return isValidVersion(version) ? version.split('.').map(Number) : [null, null, null]
}

function setVersionParts (row) {
    const [major, minor, patch] = versionParts(row.getDataValue('version'))
    row.setDataValue('major', major)
    row.setDataValue('minor', minor)
    row.setDataValue('patch', patch)
}

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
                // major, minor and patch are set here as well as in beforeValidate, so `update({ version })` saves them too
                this.setDataValue('version', value)
                setVersionParts(this)
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
                // Always derived from version, so a major, minor or patch passed alongside it cannot disagree
                setVersionParts(row)
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
                 * The schema's draft, with its author
                 * @param {number} schemaId
                 */
                draftFor: async (schemaId, options = {}) => {
                    return this.findOne({
                        where: { DataSchemaId: schemaId, status: 'draft' },
                        include: userIncludes,
                        transaction: options.transaction
                    })
                },
                /**
                 * Publish a draft with one conditional update, so when two publishes of the same draft race only one changes it
                 * @param {number} draftId
                 * @param {{ version: string, schema: object, notes?: string, publishedById: number | null }} values
                 * @returns {Promise<boolean>} false when the draft no longer exists
                 */
                publishDraft: async (draftId, { version, schema, notes, publishedById }) => {
                    // The attribute setters still run, so major, minor and patch are set from the version
                    const [count] = await this.update({
                        status: 'published',
                        version,
                        schema,
                        notes,
                        PublishedById: publishedById,
                        publishedAt: new Date()
                    }, {
                        where: { id: draftId, status: 'draft' }
                    })
                    return count === 1
                },
                /**
                 * Save a draft's document and notes only while it is still a draft
                 * @param {number} draftId
                 * @param {{ schema?: object, notes?: string }} values
                 * @returns {Promise<boolean>} false when the draft was published or discarded first
                 */
                saveDraft: async (draftId, values) => {
                    const [count] = await this.update(values, {
                        where: { id: draftId, status: 'draft' }
                    })
                    return count === 1
                },
                /**
                 * Delete a draft only while it is still a draft
                 * @param {number} draftId
                 * @returns {Promise<boolean>} false when the draft was published or discarded first
                 */
                discardDraft: async (draftId) => {
                    const count = await this.destroy({
                        where: { id: draftId, status: 'draft' }
                    })
                    return count === 1
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
