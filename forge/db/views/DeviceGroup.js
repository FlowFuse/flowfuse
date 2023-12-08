module.exports = function (app) {
    app.addSchema({
        $id: 'DeviceGroupSummary',
        type: 'object',
        properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            deviceCount: { type: 'number' }
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
            deviceCount: group.deviceCount || 0
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
            devices: { type: 'array', items: { $ref: 'Device' } }
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
                devices: item.Devices ? item.Devices.map(app.db.views.Device.device) : []
            }
            return filtered
        } else {
            return null
        }
    }

    return {
        deviceGroup,
        deviceGroupSummary
    }
}
