module.exports = function (app) {
    app.addSchema({
        $id: 'Snapshot',
        type: 'object',
        properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            createdAt: { type: 'string' },
            updatedAt: { type: 'string' },
            user: { $ref: 'UserSummary' },
            modules: { type: 'object', additionalProperties: true }
        }
    })
    function snapshot (snapshot) {
        if (snapshot) {
            const result = snapshot.toJSON()
            const filtered = {
                id: result.hashid,
                name: result.name,
                description: result.description || '',
                createdAt: result.createdAt,
                updatedAt: result.updatedAt
            }
            if (snapshot.User) {
                filtered.user = app.db.views.User.userSummary(snapshot.User)
            }
            if (snapshot.settings?.modules) {
                filtered.modules = snapshot.settings.modules
            }
            return filtered
        } else {
            return null
        }
    }
    app.addSchema({
        $id: 'SnapshotSummary',
        type: 'object',
        properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' }
        }
    })
    function snapshotSummary (snapshot) {
        if (snapshot) {
            const result = snapshot.toJSON()
            const filtered = {
                id: result.hashid,
                name: result.name,
                description: result.description || ''
            }
            return filtered
        } else {
            return null
        }
    }
    app.addSchema({
        $id: 'ExportedSnapshot',
        type: 'object',
        properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            createdAt: { type: 'string' },
            updatedAt: { type: 'string' },
            user: { $ref: 'UserSummary' },
            userWhoExported: { $ref: 'UserSummary' },
            modules: { type: 'object', additionalProperties: true },
            flows: { type: 'object', additionalProperties: true },
            settings: { type: 'object', additionalProperties: true }
        }
    })

    return {
        snapshot,
        snapshotSummary
    }
}
