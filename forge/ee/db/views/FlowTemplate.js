module.exports = function (app) {
    app.addSchema({
        $id: 'FlowBlueprintSummary',
        type: 'object',
        properties: {
            id: { type: 'string' },
            active: { type: 'boolean' },
            name: { type: 'string' },
            description: { type: 'string' },
            category: { type: 'string' },
            icon: { type: 'string' },
            order: { type: 'number' },
            default: { type: 'boolean' },
            flows: { type: 'object', additionalProperties: true },
            createdAt: { type: 'string' },
            updatedAt: { type: 'string' },
            externalUrl: { type: 'string' }
        }
    })
    function flowBlueprintSummary (blueprint) {
        return {
            id: blueprint.hashid,
            active: blueprint.active,
            name: blueprint.name,
            description: blueprint.description,
            category: blueprint.category,
            icon: blueprint.icon,
            order: blueprint.order,
            default: blueprint.default,
            flows: blueprint.flows,
            createdAt: blueprint.createdAt,
            updatedAt: blueprint.updatedAt,
            externalUrl: blueprint.externalUrl
        }
    }

    app.addSchema({
        $id: 'FlowBlueprint',
        type: 'object',
        allOf: [{ $ref: 'FlowBlueprintSummary' }],
        properties: {
            flows: { type: 'object', additionalProperties: true },
            modules: { type: 'object', additionalProperties: true },
            teamTypeScope: {
                type: ['array', 'null'],
                items: {
                    type: 'string'
                }
            }
        }
    })
    function flowBlueprint (blueprint) {
        const result = flowBlueprintSummary(blueprint)
        if (Array.isArray(blueprint.teamTypeScope)) {
            result.teamTypeScope = blueprint.teamTypeScope.map(id => app.db.models.TeamType.encodeHashid(id))
        } else {
            result.teamTypeScope = null // default (allow all)
        }
        result.flows = blueprint.flows
        result.modules = blueprint.modules
        return result
    }

    app.addSchema({
        $id: 'FlowBlueprintSummaryList',
        type: 'array',
        items: {
            $ref: 'FlowBlueprintSummary'
        }
    })

    app.addSchema({
        $id: 'FlowBlueprintExport',
        type: 'object',
        properties: {
            blueprints: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        name: { type: 'string' },
                        description: { type: 'string' },
                        category: { type: 'string' },
                        icon: { type: 'string' },
                        flows: { type: 'object', additionalProperties: true },
                        modules: { type: 'object', additionalProperties: true }
                    }
                }
            },
            count: { type: 'integer' }
        }
    })

    function flowBlueprintExport (blueprint) {
        return {
            name: blueprint.name,
            description: blueprint.description,
            category: blueprint.category,
            icon: blueprint.icon,
            flows: blueprint.flows,
            modules: blueprint.modules
        }
    }

    return {
        flowBlueprint,
        flowBlueprintExport,
        flowBlueprintSummary
    }
}
