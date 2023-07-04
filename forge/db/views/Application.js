module.exports = function (app) {
    app.addSchema({
        $id: 'Application',
        type: 'object',
        properties: {
            id: { type: 'string' },
            name: { type: 'string' },
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
            links: { $ref: 'LinksMeta' }
        },
        additionalProperties: true
    })
    function applicationSummary (application) {
        // application could already be a vanilla object,
        // or a database model object.
        if (Object.hasOwn(application, 'get')) {
            application = application.get({ plain: true })
        }

        return {
            id: application.hashid,
            name: application.name,
            links: application.links
        }
    }

    app.addSchema({
        $id: 'TeamApplicationList',
        type: 'array',
        items: {
            type: 'object',
            allOf: [{ $ref: 'ApplicationSummary' }],
            properties: {
                instances: { type: 'array', items: { type: 'object', additionalProperties: true } }
            },
            additionalProperties: true
        }
    })
    async function teamApplicationList (applications, { includeInstances = false } = {}) {
        return applications.map((application) => {
            const summary = applicationSummary(application)
            if (includeInstances) {
                summary.instances = app.db.views.Project.instancesSummaryList(application.Instances)
            }
            return summary
        })
    }

    app.addSchema({
        $id: 'ApplicationInstanceStatusList',
        type: 'array',
        items: {
            type: 'object',
            allOf: [{ $ref: 'ApplicationSummary' }],
            properties: {
                id: { type: 'string' },
                instances: { $ref: 'InstanceStatusList' }
            },
            additionalProperties: true
        }
    })
    async function applicationInstanceStatusList (applicationsArray) {
        return Promise.all(applicationsArray.map(async (application) => {
            return {
                id: application.hashid,
                instances: await app.db.views.Project.instanceStatusList(application.Instances)
            }
        }))
    }

    return {
        application,
        applicationInstanceStatusList,
        teamApplicationList,
        applicationSummary
    }
}
