module.exports = function (app) {
    app.addSchema({
        $id: 'ProjectTypeSummary',
        type: 'object',
        properties: {
            id: { type: 'string' },
            name: { type: 'string' }
        }
    })
    function projectTypeSummary (projectType) {
        if (projectType.toJSON) {
            projectType = projectType.toJSON()
        }
        return {
            id: projectType.hashid,
            name: projectType.name
        }
    }
    function projectType (projectType, includeCount) {
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
    return {
        projectType,
        projectTypeSummary
    }
}
