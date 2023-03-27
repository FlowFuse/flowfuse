module.exports = {
    application: function (app, application) {
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
    },
    applicationSummary: function (app, application) {
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
    },
    teamApplicationList: function (app, applications, { includeInstances = false } = {}) {
        return applications.map(application => {
            const summary = app.db.views.Application.applicationSummary(application)
            if (includeInstances) {
                summary.instances = application.Instances.map(app.db.views.Project.projectSummary)
            }

            return summary
        })
    }
}
