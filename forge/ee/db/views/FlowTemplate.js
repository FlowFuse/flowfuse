module.exports = function (app) {
    app.addSchema({
        $id: 'FlowTemplateSummary',
        type: 'object',
        properties: {
            id: { type: 'string' },
            active: { type: 'boolean' },
            name: { type: 'string' },
            description: { type: 'string' },
            category: { type: 'string' },
            createdAt: { type: 'string' },
            updatedAt: { type: 'string' }
        }
    })
    function flowTemplateSummary (flowTemplate) {
        return {
            id: flowTemplate.hashid,
            active: flowTemplate.active,
            name: flowTemplate.name,
            description: flowTemplate.description,
            category: flowTemplate.category,
            createdAt: flowTemplate.createdAt,
            updatedAt: flowTemplate.updatedAt
        }
    }

    app.addSchema({
        $id: 'FlowTemplate',
        type: 'object',
        allOf: [{ $ref: 'FlowTemplateSummary' }],
        properties: {
            flows: { type: 'object', additionalProperties: true },
            modules: { type: 'object', additionalProperties: true }
        }
    })
    function flowTemplate (flowTemplate) {
        const result = flowTemplateSummary(flowTemplate)
        result.flows = flowTemplate.flows
        result.modules = flowTemplate.modules
        return result
    }

    app.addSchema({
        $id: 'FlowTemplateSummaryList',
        type: 'array',
        items: {
            $ref: 'FlowTemplateSummary'
        }
    })

    return {
        flowTemplate,
        flowTemplateSummary
    }
}
