module.exports = {
    stack: function (app, stack) {
        if (stack) {
            const result = stack.toJSON()
            const filtered = {
                id: result.hashid,
                name: result.name,
                active: result.active,
                properties: result.properties || {},
                createdAt: result.createdAt,
                projectCount: result.projectCount
            }
            return filtered
        } else {
            return null
        }
    }
}
