module.exports = function (app) {
    app.addSchema({
        $id: 'Device',
        type: 'object',
        properties: {
            id: { type: 'string' },
            ownerType: { type: 'string' },
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
            isDeploying: { type: 'boolean' },
            agentVersion: { type: 'string' },
            mode: { type: 'string' },
            links: { $ref: 'LinksMeta' },
            team: { $ref: 'TeamSummary' },
            instance: { $ref: 'InstanceSummary' },
            application: { $ref: 'ApplicationSummary' },
            editor: { type: 'object', additionalProperties: true },
            deviceGroup: {
                nullable: true,
                allOf: [{ $ref: 'DeviceGroupSummary' }]
            }
        }
    })

    function device (device, { statusOnly = false } = {}) {
        if (!device) {
            return null
        }

        const result = device.toJSON ? device.toJSON() : device

        if (statusOnly) {
            return {
                id: result.hashid,
                lastSeenAt: result.lastSeenAt,
                lastSeenMs: result.lastSeenAt ? (Date.now() - new Date(result.lastSeenAt).valueOf()) : null,
                status: result.state || 'offline',
                mode: result.mode || 'autonomous',
                isDeploying: app.db.controllers.Device.isDeploying(device)
            }
        }

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
            mode: result.mode || 'autonomous',
            ownerType: result.ownerType,
            isDeploying: app.db.controllers.Device.isDeploying(device),
            deviceGroup: device.DeviceGroup && app.db.views.DeviceGroup.deviceGroupSummary(device.DeviceGroup)
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
        if (device.Application && !filtered.application) {
            filtered.application = app.db.views.Application.applicationSummary(device.Application)
        }
        if (app.license.active() && result.mode === 'developer' && app.comms?.devices?.tunnelManager) {
            /** @type {import("../../ee/lib/deviceEditor/DeviceTunnelManager").DeviceTunnelManager} */
            const tunnelManager = app.comms.devices.tunnelManager
            filtered.editor = tunnelManager.getTunnelStatus(device) || {}
        }

        return filtered
    }
    app.addSchema({
        $id: 'DeviceSummary',
        type: 'object',
        properties: {
            id: { type: 'string' },
            ownerType: { type: 'string' },
            name: { type: 'string' },
            type: { type: 'string' },
            lastSeenAt: { nullable: true, type: 'string' },
            lastSeenMs: { nullable: true, type: 'number' },
            status: { type: 'string' },
            mode: { type: 'string' },
            isDeploying: { type: 'boolean' },
            links: { $ref: 'LinksMeta' },
            mostRecentAuditLogCreatedAt: { type: 'string' },
            mostRecentAuditLogEvent: { type: 'string' }
        }
    })
    app.addSchema({
        $id: 'DeviceSummaryList',
        type: 'array',
        items: {
            $ref: 'DeviceSummary'
        }
    })
    function deviceSummary (device, { includeEditor = false } = {}) {
        if (device) {
            const result = device.toJSON ? device.toJSON() : device
            const filtered = {
                id: result.hashid,
                ownerType: result.ownerType,
                name: result.name,
                type: result.type,
                lastSeenAt: result.lastSeenAt,
                lastSeenMs: result.lastSeenAt ? (Date.now() - new Date(result.lastSeenAt).valueOf()) : null,
                status: result.state || 'offline',
                mode: result.mode || 'autonomous',
                isDeploying: app.db.controllers.Device.isDeploying(device),
                links: result.links
            }
            if (device.get('mostRecentAuditLogCreatedAt')) {
                filtered.mostRecentAuditLogCreatedAt = new Date(device.get('mostRecentAuditLogCreatedAt'))
            }
            if (device.get('mostRecentAuditLogEvent')) {
                filtered.mostRecentAuditLogEvent = device.get('mostRecentAuditLogEvent')
            }
            return filtered
        } else {
            return null
        }
    }

    app.addSchema({
        $id: 'DeviceStatus',
        type: 'object',
        properties: {
            id: { type: 'string' },
            lastSeenAt: { nullable: true, type: 'string' },
            lastSeenMs: { nullable: true, type: 'number' },
            status: { type: 'string' },
            mode: { type: 'string' },
            isDeploying: { type: 'boolean' },
            editor: { type: 'object', additionalProperties: true }
        }
    })
    app.addSchema({
        $id: 'DeviceStatusList',
        type: 'array',
        items: {
            $ref: 'DeviceStatus'
        }
    })
    async function deviceStatusList (devicesArray, { includeEditor = false } = {}) {
        return devicesArray.map((device) => {
            const summary = deviceSummary(device)

            const filtered = {
                id: summary.id,
                lastSeenAt: summary.lastSeenAt,
                lastSeenMs: summary.lastSeenMs,
                status: summary.status,
                mode: summary.mode,
                isDeploying: summary.isDeploying
            }

            if (includeEditor && app.license.active() && summary.status === 'running' && summary.mode === 'developer' && app.comms?.devices?.tunnelManager) {
                /** @type {import("../../ee/lib/deviceEditor/DeviceTunnelManager").DeviceTunnelManager} */
                const tunnelManager = app.comms.devices.tunnelManager
                filtered.editor = tunnelManager.getTunnelStatus(device) || {}
            }

            return filtered
        })
    }

    return {
        device,
        deviceSummary,
        deviceStatusList
    }
}
