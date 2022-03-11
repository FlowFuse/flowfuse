module.exports = {
    template: function (app, template) {
        if (template) {
            const result = template.toJSON()
            console.log(result)
            const filtered = {
                id: result.hashid,
                // template: result.templateId,
                // revision: result.revision,
                name: result.name,
                active: result.active,
                settings: result.settings || {},
                policy: result.policy || {},
                createdAt: result.createdAt,
                links: result.links
            }
            if (template.owner) {
                filtered.owner = app.db.views.User.publicUserProfile(template.owner)
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
                active: result.active,
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
