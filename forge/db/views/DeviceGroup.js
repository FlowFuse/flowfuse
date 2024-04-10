module.exports = function (app) {
    app.addSchema({
        $id: 'DeviceGroupSummary',
        type: 'object',
        properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            deviceCount: { type: 'number' },
            targetSnapshot: {
                nullable: true,
                allOf: [{ $ref: 'SnapshotSummary' }]
            }
        }
    })
    function deviceGroupSummary (group) {
        if (group.toJSON) {
            group = group.toJSON()
        }
        const result = {
            id: group.hashid,
            name: group.name,
            description: group.description,
            deviceCount: group.deviceCount || 0,
            targetSnapshot: app.db.views.ProjectSnapshot.snapshotSummary(group.targetSnapshot)
        }
        return result
    }

    app.addSchema({
        $id: 'DeviceGroupPipelineSummary',
        type: 'object',
        allOf: [{ $ref: 'DeviceGroupSummary' }],
        properties: {
            targetMatchCount: { type: 'number' },
            activeMatchCount: { type: 'number' },
            developerModeCount: { type: 'number' },
            runningCount: { type: 'number' },
            isDeploying: { type: 'boolean' },
            hasTargetSnapshot: { type: 'boolean' }
        }
    })
    function deviceGroupPipelineSummary (group) {
        let item = group
        if (item.toJSON) {
            item = item.toJSON()
        }
        const result = {
            id: item.hashid,
            name: item.name,
            description: item.description,
            deviceCount: 0,
            targetMatchCount: 0,
            activeMatchCount: 0,
            developerModeCount: 0,
            runningCount: 0,
            isDeploying: false,
            hasTargetSnapshot: !!item.PipelineStageDeviceGroup?.targetSnapshotId
        }
        const pipelineTargetSnapshot = item.PipelineStageDeviceGroup?.targetSnapshotId ?? null
        if (item.Devices && item.Devices.length > 0) {
            result.deviceCount = item.Devices.length
            if (result.hasTargetSnapshot) {
                result.targetMatchCount = item.Devices.filter(d => d.targetSnapshotId === pipelineTargetSnapshot).length
                result.activeMatchCount = item.Devices.filter(d => d.activeSnapshotId === pipelineTargetSnapshot).length
                result.isDeploying = result.targetMatchCount > 0 && result.activeMatchCount < result.targetMatchCount
            }
            result.developerModeCount = item.Devices.filter(d => d.developerMode).length
            result.runningCount = item.Devices.filter(d => d.state === 'running').length
        }
        return result
    }

    app.addSchema({
        $id: 'DeviceGroup',
        type: 'object',
        allOf: [{ $ref: 'DeviceGroupSummary' }],
        properties: {
            createdAt: { type: 'string' },
            updatedAt: { type: 'string' },
            application: { $ref: 'ApplicationSummary' },
            devices: { type: 'array', items: { $ref: 'Device' } },
            targetSnapshot: { $ref: 'SnapshotSummary' }
        },
        additionalProperties: true
    })
    function deviceGroup (group) {
        if (group) {
            let item = group
            if (item.toJSON) {
                item = item.toJSON()
            }
            const filtered = {
                id: item.hashid,
                name: item.name,
                description: item.description,
                application: item.Application ? app.db.views.Application.applicationSummary(item.Application) : null,
                deviceCount: item.deviceCount || 0,
                devices: item.Devices ? item.Devices.map(app.db.views.Device.device) : [],
                targetSnapshot: app.db.views.ProjectSnapshot.snapshotSummary(item.targetSnapshot)
            }
            return filtered
        } else {
            return null
        }
    }

    return {
        deviceGroup,
        deviceGroupSummary,
        deviceGroupPipelineSummary
    }
}
