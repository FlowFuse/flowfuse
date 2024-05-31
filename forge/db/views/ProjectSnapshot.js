let app

module.exports = {
    init: (appInstance) => {
        app = appInstance
        app.addSchema({
            $id: 'SnapshotSummary',
            type: 'object',
            properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                description: { type: 'string' }
            }
        })
        app.addSchema({
            $id: 'Snapshot',
            type: 'object',
            allOf: [{ $ref: 'SnapshotSummary' }],
            properties: {
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
        app.addSchema({
            $id: 'SnapshotAndSettings',
            type: 'object',
            properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                description: { type: 'string' },
                createdAt: { type: 'string' },
                updatedAt: { type: 'string' },
                user: { $ref: 'UserSummary' },
                exportedBy: { $ref: 'UserSummary' },
                ownerType: { type: 'string' },
                settings: {
                    type: 'object',
                    properties: {
                        settings: { type: 'object', additionalProperties: true },
                        env: { type: 'object', additionalProperties: true },
                        modules: { type: 'object', additionalProperties: true }
                    }
                }
            }
        })
        app.addSchema({
            $id: 'FullSnapshot',
            type: 'object',
            allOf: [{ $ref: 'SnapshotAndSettings' }],
            properties: {
                flows: {
                    type: 'object',
                    properties: {
                        flows: { type: 'array', items: { type: 'object', additionalProperties: true } }
                    }
                }
            }
        })
        app.addSchema({
            $id: 'ExportedSnapshot',
            type: 'object',
            allOf: [{ $ref: 'SnapshotAndSettings' }],
            properties: {
                flows: {
                    type: 'object',
                    properties: {
                        flows: { type: 'array', items: { type: 'object', additionalProperties: true } },
                        credentials: { type: 'object', additionalProperties: true }
                    }
                }
            }
        })
    },

    snapshotSummary (snapshot) {
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
    },

    snapshot (snapshot) {
        if (snapshot) {
            const result = snapshot.toJSON ? snapshot.toJSON() : snapshot
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
    },

    snapshotExport (snapshot, exportedBy) {
        if (snapshot) {
            const result = snapshot.toJSON ? snapshot.toJSON() : snapshot
            const filtered = {
                id: result.hashid,
                name: result.name,
                description: result.description || '',
                createdAt: result.createdAt,
                updatedAt: result.updatedAt,
                flows: result.flows,
                settings: result.settings,
                ownerType: result.ownerType
            }
            if (snapshot.User) {
                filtered.user = app.db.views.User.userSummary(snapshot.User)
            }

            if (exportedBy) {
                filtered.exportedBy = app.db.views.User.userSummary(exportedBy)
            }
            return filtered
        } else {
            return null
        }
    }
}
