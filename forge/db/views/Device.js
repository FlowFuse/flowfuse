module.exports = {
    device: function (app, device) {
        if (device) {
            const result = device.toJSON()
            const filtered = {
                id: result.hashid,
                name: result.name,
                type: result.type,
                createdAt: result.createdAt,
                updatedAt: result.updatedAt,
                lastSeenAt: result.lastSeenAt,
                lastSeenMs: result.lastSeenAt ? (Date.now() - new Date(result.lastSeenAt).valueOf()) : null,
                activeSnapshot: app.db.views.ProjectSnapshot.snapshot(device.activeSnapshot),
                targetSnapshot: app.db.views.ProjectSnapshot.snapshot(device.targetSnapshot),
                links: result.links,
                status: result.state || 'offline',
                agentVersion: result.agentVersion
            }
            if (device.Team) {
                filtered.team = app.db.views.Team.teamSummary(device.Team)
            }
            if (device.Project) {
                filtered.project = app.db.views.Project.projectSummary(device.Project)
                if (device.Project.Application) {
                    filtered.application = app.db.views.Application.applicationSummary(device.Project.Application)
                }
            }

            return filtered
        } else {
            return null
        }
    },

    deviceSummary: function (app, device) {
        if (device) {
            const result = device.toJSON()
            const filtered = {
                id: result.hashid,
                name: result.name,
                type: result.type,
                links: result.links
            }
            return filtered
        } else {
            return null
        }
    }
}
