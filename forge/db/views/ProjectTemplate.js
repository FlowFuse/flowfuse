module.exports = {
    template: function (app, template) {
        if (template) {
            const result = template.toJSON()
            const filtered = {
                id: result.hashid,
                // template: result.templateId,
                // revision: result.revision,
                name: result.name,
                description: result.description,
                active: result.active,
                settings: result.settings || {},
                policy: result.policy || {},
                createdAt: result.createdAt,
                links: result.links
            }
            if (template.owner) {
                filtered.owner = app.db.views.User.publicUserProfile(template.owner)
            }
            if (filtered.settings.httpNodeAuth) {
                // Only return whether a password is set or not
                filtered.settings.httpNodeAuth.pass = !!filtered.settings.httpNodeAuth.pass
            }
            return filtered
        } else {
            return null
        }
    },
    templateSummary: function (app, template) {
        if (template) {
            const result = template.toJSON()
            const filtered = {
                id: result.hashid,
                // template: result.templateId,
                // revision: result.revision,
                name: result.name,
                description: result.description,
                active: result.active,
                projectCount: result.projectCount,
                createdAt: result.createdAt,
                links: result.links
            }
            if (template.owner) {
                filtered.owner = app.db.views.User.shortProfile(template.owner)
            }
            return filtered
        } else {
            return null
        }
    }
}
