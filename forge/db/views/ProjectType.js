module.exports = {
    projectType: function (app, projectType, includeCount) {
        if (projectType) {
            const result = projectType.toJSON()
            const filtered = {
                id: result.hashid,
                name: result.name,
                active: result.active,
                description: result.description,
                order: result.order,
                properties: result.properties || {},
                createdAt: result.createdAt,
                defaultStack: app.db.models.ProjectStack.encodeHashid(result.defaultStackId) || null
            }
            if (includeCount) {
                filtered.projectCount = parseInt(result.projectCount) || 0
                filtered.stackCount = parseInt(result.stackCount) || 0
            }
            return filtered
        } else {
            return null
        }
    }
}
