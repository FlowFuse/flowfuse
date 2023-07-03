module.exports = function (app) {
    app.addSchema({
        $id: 'Stack',
        type: 'object',
        properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            label: { type: 'string' },
            active: { type: 'boolean' },
            projectType: { type: 'string' },
            properties: { type: 'object', additionalProperties: true },
            replacedBy: { type: 'string' },
            createdAt: { type: 'string' },
            instanceCount: { type: 'number' },
            links: { $ref: 'LinksMeta' }
        }
    })

    function stack (stack, includeCount) {
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
                createdAt: result.createdAt,
                links: stack.links
            }
            if (includeCount) {
                filtered.instanceCount = parseInt(result.projectCount) || 0
            }
            return filtered
        } else {
            return null
        }
    }

    app.addSchema({
        $id: 'StackSummary',
        type: 'object',
        properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            label: { type: 'string' },
            properties: { type: 'object', additionalProperties: true },
            replacedBy: { type: 'string' },
            links: { $ref: 'LinksMeta' }
        }
    })
    function stackSummary (stack) {
        if (stack.toJSON) {
            stack = stack.toJSON()
        }
        return {
            id: stack.hashid,
            name: stack.name,
            label: stack.label,
            properties: stack.properties || {},
            replacedBy: app.db.models.ProjectStack.encodeHashid(stack.replacedBy) || undefined,
            links: stack.links
        }
    }
    return {
        stack,
        stackSummary
    }
}
