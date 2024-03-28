const { registerPermissions } = require('../../../lib/permissions')
const { Roles } = require('../../../lib/roles.js')

const hasValueChanged = (requestProp, existingProp) => (requestProp !== undefined && existingProp !== requestProp)

module.exports = async function (app) {
    app.config.features.register('flowBlueprints', true, true)

    registerPermissions({
        'flow-blueprint:create': { description: 'Create a Flow Blueprint', role: Roles.Admin },
        'flow-blueprint:list': { description: 'List all Flow Blueprints' },
        'flow-blueprint:read': { description: 'View a Flow Blueprint' },
        'flow-blueprint:delete': { description: 'Delete a Flow Blueprint', role: Roles.Admin },
        'flow-blueprint:edit': { description: 'Edit a Flow Blueprint', role: Roles.Admin }
    })

    app.get('/', {
        preHandler: app.needsPermission('flow-blueprint:list'),
        schema: {
            summary: 'Get a list of the available flow blueprints',
            tags: ['Flow Blueprints'],
            query: { $ref: 'PaginationParams' },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        meta: { $ref: 'PaginationMeta' },
                        count: { type: 'number' },
                        blueprints: { $ref: 'FlowBlueprintSummaryList' }
                    }
                },
                '4xx': {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        const paginationOptions = app.getPaginationOptions(request)
        let filter = { active: true }
        if (request.query.filter === 'all') {
            filter = {}
        } else if (request.query.filter === 'active') {
            // Default behaviour
            filter = { active: true }
        } else if (request.query.filter === 'inactive') {
            filter = { active: false }
        }

        if (request.query.team) {
            const team = await app.db.models.Team.byId(request.query.team)
            if (!team) {
                return reply.code(404).send({ code: 'not_found', error: 'Not Found' })
            }
            const flowTemplates = await app.db.models.FlowTemplate.forTeamType(team.TeamTypeId, paginationOptions, filter)
            flowTemplates.blueprints = flowTemplates.templates.map(ft => app.db.views.FlowTemplate.flowBlueprintSummary(ft))
            reply.send(flowTemplates)
        } else {
            // get all flow templates - typically for administration purposes
            const flowTemplates = await app.db.models.FlowTemplate.getAll(paginationOptions, filter)
            flowTemplates.blueprints = flowTemplates.templates.map(ft => app.db.views.FlowTemplate.flowBlueprintSummary(ft))
            reply.send(flowTemplates)
        }
    })

    app.get('/:flowBlueprintId', {
        preHandler: app.needsPermission('flow-blueprint:read'),
        schema: {
            summary: 'Get full details of a flow blueprint',
            tags: ['Flow Blueprints'],
            params: {
                type: 'object',
                properties: {
                    flowBlueprintId: { type: 'string' }
                }
            },
            response: {
                200: {
                    $ref: 'FlowBlueprint'
                },
                '4xx': {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        const flowTemplate = await app.db.models.FlowTemplate.byId(request.params.flowBlueprintId)
        if (!flowTemplate) {
            reply.code(404).send({ code: 'not_found', error: 'Not Found' })
            return
        }
        const response = app.db.views.FlowTemplate.flowBlueprint(flowTemplate)
        reply.send(response)
    })

    app.delete('/:flowBlueprintId', {
        preHandler: app.needsPermission('flow-blueprint:delete'),
        schema: {
            summary: 'Delete a flow blueprint - admin-only',
            tags: ['Flow Blueprints'],
            params: {
                type: 'object',
                properties: {
                    flowBlueprintId: { type: 'string' }
                }
            },
            response: {
                200: {
                    $ref: 'APIStatus'
                },
                '4xx': {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        const flowTemplate = await app.db.models.FlowTemplate.byId(request.params.flowBlueprintId)
        if (!flowTemplate) {
            reply.code(404).send({ code: 'not_found', error: 'Not Found' })
            return
        }
        await flowTemplate.destroy()
        reply.send({ status: 'okay' })
    })

    app.post('/', {
        preHandler: app.needsPermission('flow-blueprint:create'),
        schema: {
            summary: 'Create a flow blueprint - admin-only',
            tags: ['Flow Blueprints'],
            body: {
                type: 'object',
                allOf: [{ $ref: 'FlowBlueprint' }],
                required: ['name']
            },
            response: {
                200: {
                    $ref: 'FlowBlueprintSummary'
                },
                '4xx': {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        // Only admins can create a Flow Blueprint
        const properties = {
            active: request.body.active !== undefined ? request.body.active : false,
            name: request.body.name,
            description: request.body.description,
            category: request.body.category,
            icon: request.body.icon,
            order: request.body.order,
            default: request.body.default,
            flows: request.body.flows,
            modules: request.body.modules,
            teamTypeScope: await sanitiseTeamTypeScope(request.body.teamTypeScope)
        }
        try {
            const flowTemplate = await app.db.models.FlowTemplate.create(properties)
            const response = app.db.views.FlowTemplate.flowBlueprintSummary(flowTemplate, true)
            reply.send(response)
        } catch (err) {
            let responseMessage
            if (err.errors) {
                responseMessage = err.errors.map(err => err.message).join(',')
            } else {
                responseMessage = err.toString()
            }
            const resp = { code: 'unexpected_error', error: responseMessage }
            reply.code(400).send(resp)
        }
    })

    app.put('/:flowBlueprintId', {
        preHandler: app.needsPermission('flow-blueprint:edit'),
        schema: {
            summary: 'Update a flow blueprint - admin-only',
            tags: ['Flow Blueprints'],
            params: {
                type: 'object',
                properties: {
                    flowBlueprintId: { type: 'string' }
                }
            },
            body: {
                $ref: 'FlowBlueprint'
            },
            response: {
                200: {
                    $ref: 'FlowBlueprintSummary'
                },
                '4xx': {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        // Only admins can modify a Flow Blueprint
        const flowTemplate = await app.db.models.FlowTemplate.byId(request.params.flowBlueprintId)
        if (!flowTemplate) {
            reply.code(404).send({ code: 'not_found', error: 'Not Found' })
            return
        }

        // These simple properties can be easily checked for changes
        [
            'name',
            'description',
            'category',
            'active',
            'icon',
            'order',
            'default'
        ].forEach(prop => {
            if (hasValueChanged(request.body[prop], flowTemplate[prop])) {
                flowTemplate[prop] = request.body[prop]
            }
        })

        // These are objects - no need to check, just update if present
        if (request.body.flows !== undefined) {
            flowTemplate.flows = request.body.flows
        }
        if (request.body.modules !== undefined) {
            flowTemplate.modules = request.body.modules
        }
        flowTemplate.teamTypeScope = await sanitiseTeamTypeScope(request.body.teamTypeScope)

        try {
            await flowTemplate.save()
            await flowTemplate.reload()
            const response = app.db.views.FlowTemplate.flowBlueprintSummary(flowTemplate, true)
            reply.send(response)
        } catch (err) {
            let responseMessage
            if (err.errors) {
                responseMessage = err.errors.map(err => err.message).join(',')
            } else {
                responseMessage = err.toString()
            }
            const resp = { code: 'unexpected_error', error: responseMessage }
            reply.code(400).send(resp)
        }
    })

    /**
     * Sanitise the teamTypeScope array before saving to the database
     */
    async function sanitiseTeamTypeScope (teamTypeScope) {
        // An array signifies that this template is only available to specific teamTypes
        // An empty array signifies that this template is not available to any teamTypes
        // A `null` value signifies that this template is available to all teamTypes (current and future ones)
        try {
            if (Array.isArray(teamTypeScope)) {
                const teamTypeIds = teamTypeScope.map(id => Number(app.db.models.TeamType.decodeHashid(id))).filter(id => id)
                const matchingTeamTypes = await app.db.models.TeamType.findAll({ where: { id: teamTypeIds } })
                return matchingTeamTypes ? [...matchingTeamTypes.map(tt => tt.id)] : []
            }
        } catch (_err) {
            // If there are any errors, just return null
            return null
        }
        return null
    }
}
