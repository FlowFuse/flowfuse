module.exports = function (app) {
    app.addSchema({
        $id: 'FlowBlueprintSummary',
        type: 'object',
        // Composed via `allOf` elsewhere — keep open.
        properties: {
            id: { type: 'string' },
            active: { type: 'boolean' },
            name: { type: 'string' },
            // Coerced to '' when null — frontend uses these in string ops (marked.parse, toLowerCase).
            description: { type: 'string' },
            category: { type: 'string' },
            icon: { type: 'string', nullable: true },
            order: { type: 'number' },
            default: { type: 'boolean' },
            createdAt: { type: 'string' },
            updatedAt: { type: 'string' },
            externalUrl: { type: 'string', nullable: true }
        },
        required: ['id', 'name', 'createdAt', 'updatedAt']
    })
    function flowBlueprintSummary (blueprint) {
        return {
            id: blueprint.hashid,
            active: blueprint.active,
            name: blueprint.name,
            description: blueprint.description ?? '',
            category: blueprint.category ?? '',
            icon: blueprint.icon ?? null,
            order: blueprint.order,
            default: blueprint.default,
            createdAt: blueprint.createdAt,
            updatedAt: blueprint.updatedAt,
            externalUrl: blueprint.externalUrl ?? null
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
        },
        required: ['flows', 'modules', 'teamTypeScope']
    })
    // Writable subset for POST/PUT bodies — `id`, `createdAt`, `updatedAt` are server-set.
    app.addSchema({
        $id: 'FlowBlueprintInput',
        type: 'object',
        properties: {
            active: { type: 'boolean' },
            name: { type: 'string' },
            description: { type: 'string' },
            category: { type: 'string' },
            icon: { type: 'string', nullable: true },
            order: { type: 'number' },
            default: { type: 'boolean' },
            externalUrl: { type: 'string', nullable: true },
            flows: { type: 'object', additionalProperties: true },
            modules: { type: 'object', additionalProperties: true },
            teamTypeScope: { type: ['array', 'null'], items: { type: 'string' } }
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
                        id: { type: 'string' },
                        name: { type: 'string' },
                        description: { type: 'string' },
                        category: { type: 'string' },
                        icon: { type: 'string', nullable: true },
                        flows: { type: 'object', additionalProperties: true },
                        modules: { type: 'object', additionalProperties: true }
                    },
                    required: ['name', 'description', 'category', 'icon', 'flows', 'modules'],
                    additionalProperties: false
                }
            },
            count: { type: 'integer' }
        },
        required: ['blueprints', 'count'],
        additionalProperties: false
    })

    function flowBlueprintExport (blueprint, includeId = false) {
        const returnedBlueprint = {
            name: blueprint.name,
            description: blueprint.description,
            category: blueprint.category,
            icon: blueprint.icon,
            flows: blueprint.flows,
            modules: blueprint.modules
        }

        if (includeId) {
            returnedBlueprint.id = blueprint.hashid
        }
        return returnedBlueprint
    }

    return {
        flowBlueprint,
        flowBlueprintExport,
        flowBlueprintSummary
    }
}
