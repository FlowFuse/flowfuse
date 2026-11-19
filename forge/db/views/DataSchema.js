module.exports = function (app) {
    app.addSchema({
        $id: 'DataSchemaSummary',
        type: 'object',
        properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            group: {
                type: 'object',
                nullable: true,
                properties: {
                    id: { type: 'string' },
                    name: { type: 'string' }
                },
                required: ['id', 'name']
            },
            latestVersion: { type: 'string', nullable: true },
            latestPublishedAt: { type: 'string', nullable: true },
            hasDraft: { type: 'boolean' },
            createdAt: { type: 'string' },
            updatedAt: { type: 'string' }
        },
        required: ['id', 'name', 'description', 'group', 'latestVersion', 'latestPublishedAt', 'hasDraft', 'createdAt', 'updatedAt']
    })
    function schemaSummary (schema) {
        if (schema.toJSON) {
            schema = schema.toJSON()
        }
        const group = schema.DataSchemaGroup
        return {
            id: schema.hashid,
            name: schema.name,
            description: schema.description ?? '',
            group: group ? { id: group.hashid, name: group.name } : null,
            latestVersion: schema.latestVersion ?? null,
            // Comes from a subquery, so SQLite returns it as a string
            latestPublishedAt: schema.latestPublishedAt ? new Date(schema.latestPublishedAt).toISOString() : null,
            hasDraft: parseInt(schema.draftCount) > 0,
            createdAt: schema.createdAt,
            updatedAt: schema.updatedAt
        }
    }

    app.addSchema({
        $id: 'DataSchema',
        type: 'object',
        allOf: [{ $ref: 'DataSchemaSummary' }],
        properties: {
            versions: { type: 'array', items: { $ref: 'DataSchemaVersionSummary' } }
        },
        required: ['versions']
    })
    /**
     * @param {*} schema a DataSchema loaded with `byId` or `byName`
     * @param {*[]} versions its versions from `DataSchemaVersion.forSchema`
     */
    function schema (schema, versions) {
        return {
            ...schemaSummary(schema),
            versions: versions.map(app.db.views.DataSchemaVersion.versionSummary)
        }
    }

    return {
        schemaSummary,
        schema
    }
}
