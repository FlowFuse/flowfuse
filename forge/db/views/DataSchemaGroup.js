module.exports = function (app) {
    app.addSchema({
        $id: 'DataSchemaGroup',
        type: 'object',
        properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            schemaCount: { type: 'number' },
            createdAt: { type: 'string' },
            updatedAt: { type: 'string' }
        },
        required: ['id', 'name', 'schemaCount', 'createdAt', 'updatedAt']
    })
    function group (group) {
        if (group.toJSON) {
            group = group.toJSON()
        }
        return {
            id: group.hashid,
            name: group.name,
            schemaCount: parseInt(group.schemaCount) || 0,
            createdAt: group.createdAt,
            updatedAt: group.updatedAt
        }
    }

    return {
        group
    }
}
