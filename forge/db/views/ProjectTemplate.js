module.exports = function (app) {
    app.addSchema({
        $id: 'Template',
        type: 'object',
        allOf: [{ $ref: 'TemplateSummary' }],
        properties: {
            settings: { type: 'object', additionalProperties: true },
            policy: { type: 'object', additionalProperties: true }
        }
    })
    function template (template) {
        if (template) {
            const result = template.toJSON()
            const filtered = {
                id: result.hashid,
                name: result.name,
                description: result.description,
                active: result.active,
                instanceCount: result.projectCount,
                settings: result.settings || {},
                policy: result.policy || {},
                createdAt: result.createdAt,
                links: result.links
            }
            if (template.owner) {
                filtered.owner = app.db.views.User.userSummary(template.owner)
            }
            if (filtered.settings.httpNodeAuth) {
                // Only return whether a password is set or not
                filtered.settings.httpNodeAuth.pass = !!filtered.settings.httpNodeAuth.pass
            }
            return filtered
        } else {
            return null
        }
    }
    app.addSchema({
        $id: 'TemplateSummary',
        type: 'object',
        properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            active: { type: 'boolean' },
            instanceCount: { type: 'number' },
            createdAt: { type: 'string' },
            links: { $ref: 'LinksMeta' },
            owner: { $ref: 'UserSummary' }
        }
    })
    function templateSummary (template) {
        if (template) {
            const result = template.toJSON()
            const filtered = {
                id: result.hashid,
                name: result.name,
                description: result.description,
                active: result.active,
                instanceCount: result.projectCount,
                createdAt: result.createdAt,
                links: result.links
            }
            if (template.owner) {
                filtered.owner = app.db.views.User.userSummary(template.owner)
            }
            return filtered
        } else {
            return null
        }
    }
    return {
        template,
        templateSummary
    }
}
