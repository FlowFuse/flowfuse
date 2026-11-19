module.exports = function (app) {
    app.addSchema({
        $id: 'DataSchemaVersionSummary',
        type: 'object',
        properties: {
            version: { type: 'string', nullable: true },
            status: { type: 'string', enum: ['draft', 'published', 'deprecated'] },
            notes: { type: 'string' },
            format: { type: 'string' },
            createdBy: { nullable: true, allOf: [{ $ref: 'UserSummary' }] },
            publishedBy: { nullable: true, allOf: [{ $ref: 'UserSummary' }] },
            createdAt: { type: 'string' },
            publishedAt: { type: 'string', nullable: true },
            updatedAt: { type: 'string' }
        },
        required: ['version', 'status', 'notes', 'format', 'createdBy', 'publishedBy', 'createdAt', 'publishedAt', 'updatedAt']
    })
    function versionSummary (version) {
        return {
            version: version.version ?? null,
            status: version.status,
            notes: version.notes ?? '',
            format: version.format,
            createdBy: version.CreatedBy ? app.db.views.User.userSummary(version.CreatedBy) : null,
            publishedBy: version.PublishedBy ? app.db.views.User.userSummary(version.PublishedBy) : null,
            createdAt: version.createdAt,
            publishedAt: version.publishedAt ?? null,
            updatedAt: version.updatedAt
        }
    }

    app.addSchema({
        $id: 'DataSchemaVersion',
        type: 'object',
        allOf: [{ $ref: 'DataSchemaVersionSummary' }],
        properties: {
            schema: { type: 'object', additionalProperties: true }
        },
        required: ['schema']
    })
    function version (version) {
        return {
            ...versionSummary(version),
            schema: version.schema
        }
    }

    app.addSchema({
        $id: 'DataSchemaDraft',
        type: 'object',
        allOf: [{ $ref: 'DataSchemaVersion' }],
        properties: {
            problems: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        path: { type: 'string' },
                        message: { type: 'string' }
                    },
                    required: ['path', 'message']
                }
            }
        },
        required: ['problems']
    })
    /**
     * @param {*} draft the draft version
     * @param {{ path: string, message: string }[]} problems what stops it compiling
     */
    function draft (draft, problems) {
        return {
            ...version(draft),
            problems
        }
    }

    return {
        versionSummary,
        version,
        draft
    }
}
