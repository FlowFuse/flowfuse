module.exports = {
    stack: function (app, stack, includeCount) {
        if (stack) {
            const result = stack.toJSON()
            const filtered = {
                id: result.hashid,
                name: result.name,
                label: result.label,
                active: result.active,
                projectType: app.db.models.ProjectType.encodeHashid(result.ProjectTypeId) || undefined,
                properties: result.properties || {},
                replacedBy: app.db.models.ProjectStack.encodeHashid(result.replacedBy) || undefined,
                createdAt: result.createdAt
            }
            if (includeCount) {
                filtered.projectCount = parseInt(result.projectCount) || 0
            }
            return filtered
        } else {
            return null
        }
    }
}
