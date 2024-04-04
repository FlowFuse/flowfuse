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
            modules: { type: 'object', additionalProperties: true },
            ownerType: { type: 'string' },
            deviceId: { type: 'string' },
            projectId: { type: 'string' },
            device: { $ref: 'DeviceSummary' },
            project: { $ref: 'InstanceSummary' }
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
                updatedAt: result.updatedAt,
                ownerType: result.ownerType,
                deviceId: result.Device?.hashid,
                projectId: result.Project?.id
            }
            if (snapshot.User) {
                filtered.user = app.db.views.User.userSummary(snapshot.User)
            }
            if (filtered.deviceId) {
                filtered.device = app.db.views.Device.device(snapshot.Device)
            }
            if (filtered.projectId) {
                filtered.project = app.db.views.Project.projectSummary(snapshot.Project)
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
            const result = snapshot.toJSON ? snapshot.toJSON() : snapshot
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
            exportedBy: { $ref: 'UserSummary' },
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
