let app

module.exports = {
    init: (appInstance) => {
        app = appInstance
        app.addSchema({
            $id: 'SnapshotSummary',
            type: 'object',
            // Composed via `allOf` elsewhere — keep open.
            properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                description: { type: 'string' },
                createdAt: { type: 'string' }
            },
            required: ['id', 'name', 'description']
        })
        app.addSchema({
            $id: 'Snapshot',
            type: 'object',
            allOf: [{ $ref: 'SnapshotSummary' }],
            properties: {
                createdAt: { type: 'string' },
                updatedAt: { type: 'string' },
                // Narrow user shape — don't expose admin/suspended on every snapshot list.
                user: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        username: { type: 'string' },
                        name: { type: 'string' },
                        avatar: { type: 'string' }
                    },
                    required: ['id', 'username', 'name', 'avatar']
                },
                modules: { type: 'object', additionalProperties: true },
                ownerType: { type: 'string' },
                deviceId: { type: 'string' },
                projectId: { type: 'string' },
                device: { $ref: 'DeviceSummary' },
                project: { $ref: 'InstanceSummary' }
            },
            required: ['createdAt', 'updatedAt', 'ownerType']
        })
        // Narrow user shape — don't expose admin/suspended on snapshot export payloads.
        const narrowUser = {
            type: 'object',
            properties: {
                id: { type: 'string' },
                username: { type: 'string' },
                name: { type: 'string' },
                avatar: { type: 'string' }
            },
            required: ['id', 'username', 'name', 'avatar']
        }
        app.addSchema({
            $id: 'SnapshotAndSettings',
            type: 'object',
            // Composed via `allOf` elsewhere — keep open.
            properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                description: { type: 'string' },
                createdAt: { type: 'string' },
                updatedAt: { type: 'string' },
                user: narrowUser,
                exportedBy: narrowUser,
                ownerType: { type: 'string' },
                settings: {
                    type: 'object',
                    properties: {
                        settings: { type: 'object', additionalProperties: true },
                        env: { type: 'object', additionalProperties: true },
                        modules: { type: 'object', additionalProperties: true }
                    }
                }
            },
            required: ['id', 'name', 'description', 'createdAt', 'updatedAt', 'ownerType', 'settings']
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
            },
            required: ['flows']
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
            },
            required: ['flows']
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

            if (result.createdAt) {
                filtered.createdAt = result.createdAt
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
                filtered.device = app.db.views.Device.deviceSummary(snapshot.Device)
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
