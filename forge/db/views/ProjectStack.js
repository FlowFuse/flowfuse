module.exports = {
    stack: function (app, stack, count) {
        if (stack) {
            const result = stack.toJSON()
            const filtered = {
                id: result.hashid,
                name: result.name,
                active: result.active,
                properties: result.properties || {},
                createdAt: result.createdAt
            }
            if (count) {
                filtered.projectCount = result.projectCount
            }
            return filtered
        } else {
            return null
        }
    }
}
