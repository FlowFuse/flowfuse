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
                agentVersion: result.agentVersion,
                mode: result.mode || 'autonomous'
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
            if (app.comms?.devices?.tunnelManager) {
                /** @type {import("../../comms/DeviceTunnelManager").DeviceTunnelManager} */
                const tunnelManager = app.comms?.devices.tunnelManager
                const { exists, url, urlWithToken, enabled, connected } = tunnelManager.getTunnelStatus(result.hashid) || {}
                filtered.tunnelExists = exists || false
                filtered.tunnelEnabled = enabled || false
                filtered.tunnelConnected = connected || false
                filtered.tunnelUrl = url || null
                filtered.tunnelUrlWithToken = urlWithToken || null
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
