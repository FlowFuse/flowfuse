module.exports = function (app) {
    app.addSchema({
        $id: 'Application',
        type: 'object',
        properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            createdAt: { type: 'string' },
            updatedAt: { type: 'string' },
            links: { $ref: 'LinksMeta' },
            team: { $ref: 'TeamSummary' }
        }
    })
    function application (application) {
        if (application) {
            const raw = application.toJSON()
            const filtered = {
                id: raw.hashid,
                name: raw.name,
                description: raw.description,
                createdAt: raw.createdAt,
                updatedAt: raw.updatedAt,
                links: raw.links
            }

            if (application.Team) {
                filtered.team = app.db.views.Team.teamSummary(application.Team)
            }

            return filtered
        } else {
            return null
        }
    }

    app.addSchema({
        $id: 'ApplicationSummary',
        type: 'object',
        properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            links: { $ref: 'LinksMeta' },
            deviceGroupCount: { type: 'number' },
            snapshotCount: { type: 'number' },
            pipelineCount: { type: 'number' }
        },
        additionalProperties: true
    })
    function applicationSummary (application, { detailed = false } = {}) {
        // application could already be a vanilla object,
        // or a database model object.
        if (Object.hasOwn(application, 'get')) {
            application = application.get({ plain: true })
        }

        const summary = {
            id: application.hashid,
            name: application.name,
            description: application.description,
            links: application.links
        }

        if (detailed) {
            summary.deviceGroupCount = application.get('deviceGroupCount')
            summary.snapshotCount = application.get('snapshotCount')
            summary.pipelineCount = application.get('pipelineCount')
        }

        return summary
    }

    app.addSchema({
        $id: 'TeamApplicationList',
        type: 'array',
        items: {
            type: 'object',
            allOf: [{ $ref: 'ApplicationSummary' }],
            properties: {
                instances: { $ref: 'InstanceSummaryList' },
                devices: { $ref: 'DeviceSummaryList' },

                // should be using oneOf but blocked by https://github.com/fastify/fast-json-stringify/issues/642
                instancesSummary: {
                    type: 'object',
                    properties: {
                        count: { type: 'number' },
                        instances: { $ref: 'InstanceSummaryList' }
                    }
                },
                devicesSummary: {
                    type: 'object',
                    properties: {
                        count: { type: 'number' },
                        devices: { $ref: 'DeviceSummaryList' }
                    }
                }
            },
            additionalProperties: true
        }
    })
    async function teamApplicationList (applications, { includeInstances = false, includeApplicationDevices = false, includeApplicationSummary = false } = {}) {
        return applications.map((application) => {
            const summary = applicationSummary(application, { detailed: includeApplicationSummary })
            if (includeInstances) {
                if (includeApplicationSummary) {
                    summary.instancesSummary = {
                        instances: app.db.views.Project.instancesSummaryList(application.Instances),
                        count: application.get('instanceCount')
                    }
                } else {
                    summary.instances = app.db.views.Project.instancesSummaryList(application.Instances)
                }
            }
            if (includeApplicationDevices) {
                if (includeApplicationSummary) {
                    summary.devicesSummary = {
                        devices: application.Devices.map(app.db.views.Device.deviceSummary),
                        count: application.get('deviceCount')
                    }
                } else {
                    summary.devices = application.Devices.map(app.db.views.Device.deviceSummary)
                }
            }
            return summary
        })
    }

    app.addSchema({
        $id: 'ApplicationAssociationsStatusList',
        type: 'array',
        items: {
            type: 'object',
            allOf: [{ $ref: 'ApplicationSummary' }],
            properties: {
                id: { type: 'string' },
                instances: { $ref: 'InstanceStatusList' },
                devices: { $ref: 'DeviceStatusList' }
            },
            additionalProperties: true
        }
    })
    async function applicationAssociationsStatusList (applicationsArray) {
        return Promise.all(applicationsArray.map(async (application) => {
            return {
                id: application.hashid,
                instances: await app.db.views.Project.instanceStatusList(application.Instances),
                devices: await app.db.views.Device.deviceStatusList(application.Devices, { includeEditor: true })
            }
        }))
    }

    return {
        application,
        applicationAssociationsStatusList,
        teamApplicationList,
        applicationSummary
    }
}
