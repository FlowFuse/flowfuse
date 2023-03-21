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
        const result = {
            id: application.hashid,
            name: application.name,
            links: application.links
        }
        return result
    },
    teamApplicationList: function (app, applications) {
        return applications.map(app => {
            return {
                id: app.hashid,
                name: app.name,
                links: app.links
            }
        })
    }
}
