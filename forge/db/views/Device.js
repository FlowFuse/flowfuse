module.exports = function (app) {
    app.addSchema({
        $id: 'Device',
        type: 'object',
        properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            type: { type: 'string' },
            createdAt: { type: 'string' },
            updatedAt: { type: 'string' },
            lastSeenAt: { nullable: true, type: 'string' },
            lastSeenMs: { nullable: true, type: 'number' },
            activeSnapshot: {
                nullable: true,
                allOf: [{ $ref: 'SnapshotSummary' }]
            },
            targetSnapshot: {
                nullable: true,
                allOf: [{ $ref: 'SnapshotSummary' }]
            },
            status: { type: 'string' },
            agentVersion: { type: 'string' },
            mode: { type: 'string' },
            links: { $ref: 'LinksMeta' },
            team: { $ref: 'TeamSummary' },
            instance: { $ref: 'InstanceSummary' },
            application: { $ref: 'ApplicationSummary' },
            editor: { type: 'object', additionalProperties: true }
        }
    })

    function device (device, options) {
        if (!device) {
            return null
        }
        options = options || {
            // future options here
        }
        const result = device.toJSON()
        const filtered = {
            id: result.hashid,
            name: result.name,
            type: result.type,
            createdAt: result.createdAt,
            updatedAt: result.updatedAt,
            lastSeenAt: result.lastSeenAt,
            lastSeenMs: result.lastSeenAt ? (Date.now() - new Date(result.lastSeenAt).valueOf()) : null,
            activeSnapshot: app.db.views.ProjectSnapshot.snapshotSummary(device.activeSnapshot),
            targetSnapshot: app.db.views.ProjectSnapshot.snapshotSummary(device.targetSnapshot),
            links: result.links,
            status: result.state || 'offline',
            agentVersion: result.agentVersion,
            mode: result.mode || 'autonomous'
        }
        if (device.Team) {
            filtered.team = app.db.views.Team.teamSummary(device.Team)
        }
        if (device.Project) {
            filtered.instance = app.db.views.Project.projectSummary(device.Project)
            if (device.Project.Application) {
                filtered.application = app.db.views.Application.applicationSummary(device.Project.Application)
            }
        }
        if (app.license.active() && result.mode === 'developer') {
            /** @type {import("../../ee/lib/deviceEditor/DeviceTunnelManager").DeviceTunnelManager} */
            const tunnelManager = app.comms.devices.tunnelManager
            filtered.editor = tunnelManager.getTunnelStatus(result.hashid) || {}
        }
        return filtered
    }
    app.addSchema({
        $id: 'DeviceSummary',
        type: 'object',
        properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            type: { type: 'string' },
            links: { $ref: 'LinksMeta' }
        }
    })
    function deviceSummary (device) {
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

    return {
        device,
        deviceSummary
    }
}
