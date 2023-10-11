const { registerPermissions } = require('../../../lib/permissions')
const { Roles } = require('../../../lib/roles.js')

const hasValueChanged = (requestProp, existingProp) => (requestProp !== undefined && existingProp !== requestProp)

module.exports = async function (app) {
    registerPermissions({
        'flow-template:create': { description: 'Create a Flow Template', role: Roles.Admin },
        'flow-template:list': { description: 'List all Flow Templates' },
        'flow-template:read': { description: 'View a Flow Template' },
        'flow-template:delete': { description: 'Delete a Flow Template', role: Roles.Admin },
        'flow-template:edit': { description: 'Edit a Flow Template', role: Roles.Admin }
    })

    app.get('/', {
        preHandler: app.needsPermission('flow-template:list'),
        schema: {
            summary: 'Get a list of the available flow templates',
            tags: ['Flow Templates'],
            query: { $ref: 'PaginationParams' },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        meta: { $ref: 'PaginationMeta' },
                        count: { type: 'number' },
                        templates: { $ref: 'FlowTemplateSummaryList' }
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
        const flowTemplates = await app.db.models.FlowTemplate.getAll(paginationOptions, filter)
        flowTemplates.templates = flowTemplates.templates.map(ft => app.db.views.FlowTemplate.flowTemplateSummary(ft))
        reply.send(flowTemplates)
    })

    app.get('/:flowTemplateId', {
        preHandler: app.needsPermission('flow-template:read'),
        schema: {
            summary: 'Get full details of a flow template',
            tags: ['Flow Templates'],
            params: {
                type: 'object',
                properties: {
                    flowTemplateId: { type: 'string' }
                }
            },
            response: {
                200: {
                    $ref: 'FlowTemplate'
                },
                '4xx': {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        const flowTemplate = await app.db.models.FlowTemplate.byId(request.params.flowTemplateId)
        if (!flowTemplate) {
            reply.code(404).send({ code: 'not_found', error: 'Not Found' })
            return
        }
        const response = app.db.views.FlowTemplate.flowTemplate(flowTemplate)
        reply.send(response)
    })

    app.delete('/:flowTemplateId', {
        preHandler: app.needsPermission('flow-template:delete'),
        schema: {
            summary: 'Delete a flow template - admin-only',
            tags: ['Flow Templates'],
            params: {
                type: 'object',
                properties: {
                    flowTemplateId: { type: 'string' }
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
        const flowTemplate = await app.db.models.FlowTemplate.byId(request.params.flowTemplateId)
        if (!flowTemplate) {
            reply.code(404).send({ code: 'not_found', error: 'Not Found' })
            return
        }
        await flowTemplate.destroy()
        reply.send({ status: 'okay' })
    })

    app.post('/', {
        preHandler: app.needsPermission('flow-template:create'),
        schema: {
            summary: 'Create a flow template - admin-only',
            tags: ['Flow Templates'],
            body: {
                type: 'object',
                required: ['name'],
                properties: {
                    active: { type: 'boolean' },
                    name: { type: 'string' },
                    description: { type: 'string' },
                    category: { type: 'string' },
                    flows: { type: 'object' },
                    modules: { type: 'object' }
                }
            },
            response: {
                200: {
                    $ref: 'FlowTemplateSummary'
                },
                '4xx': {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        // Only admins can create a Flow Template
        const properties = {
            name: request.body.name,
            description: request.body.description,
            category: request.body.category,
            active: request.body.active !== undefined ? request.body.active : false,
            flows: request.body.flows,
            modules: request.body.modules
        }
        try {
            const flowTemplate = await app.db.models.FlowTemplate.create(properties)
            const response = app.db.views.FlowTemplate.flowTemplateSummary(flowTemplate, true)
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

    app.put('/:flowTemplateId', {
        preHandler: app.needsPermission('flow-template:edit'),
        schema: {
            summary: 'Update a flow template - admin-only',
            tags: ['Flow Templates'],
            params: {
                type: 'object',
                properties: {
                    flowTemplateId: { type: 'string' }
                }
            },
            body: {
                type: 'object',
                properties: {
                    active: { type: 'boolean' },
                    name: { type: 'string' },
                    description: { type: 'string' },
                    category: { type: 'string' },
                    flows: { type: 'object' },
                    modules: { type: 'object' }
                }
            },
            response: {
                200: {
                    $ref: 'FlowTemplateSummary'
                },
                '4xx': {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        // Only admins can modify a Flow Template
        const flowTemplate = await app.db.models.FlowTemplate.byId(request.params.flowTemplateId)
        if (!flowTemplate) {
            reply.code(404).send({ code: 'not_found', error: 'Not Found' })
            return
        }

        // These simple properties can be easily checked for changes
        [
            'name',
            'description',
            'category',
            'active'
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

        try {
            await flowTemplate.save()
            await flowTemplate.reload()
            const response = app.db.views.FlowTemplate.flowTemplateSummary(flowTemplate, true)
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
}
