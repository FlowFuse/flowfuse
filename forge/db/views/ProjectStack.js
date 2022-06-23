module.exports = {
    stack: function (app, stack, includeCount) {
        if (stack) {
            const result = stack.toJSON()
            const filtered = {
                id: result.hashid,
                name: result.name,
                active: result.active,
                properties: result.properties || {},
                replacedBy: app.db.models.ProjectStack.encodeHashid(result.replacedBy) || undefined,
                createdAt: result.createdAt
            }
            if (includeCount) {
                filtered.projectCount = result.projectCount
            }
            return filtered
        } else {
            return null
        }
    }
}
