/**
 * Project Template api routes
 *
 * - /api/v1/templates
 *
 * @namespace templates
 * @memberof forge.routes.api
 */
module.exports = async function (app) {
    /**
     * Get a list of all templates
     * @name /api/v1/templates/:id
     * @static
     * @memberof forge.routes.api.templates
     */
    app.get('/', {
        preHandler: app.needsPermission('template:list')
    }, async (request, reply) => {
        const paginationOptions = app.getPaginationOptions(request)
        const templates = await app.db.models.ProjectTemplate.getAll(paginationOptions)
        templates.templates = templates.templates.map(s => app.db.views.ProjectTemplate.templateSummary(s))
        reply.send(templates)
    })

    /**
     * Get the details of a template
     * @name /api/v1/templates/:id
     * @static
     * @memberof forge.routes.api.templates
     */
    app.get('/:templateId', {
        preHandler: app.needsPermission('template:read')
    }, async (request, reply) => {
        const template = await app.db.models.ProjectTemplate.byId(request.params.templateId)
        if (template) {
            reply.send(app.db.views.ProjectTemplate.template(template))
        } else {
            reply.code(404).send({ code: 'not_found', error: 'Not Found' })
        }
    })

    /**
     * Create a template
     * @name /api/v1/templates
     * @static
     * @memberof forge.routes.api.templates
     */
    app.post('/', {
        preHandler: app.needsPermission('template:create'),
        schema: {
            body: {
                type: 'object',
                required: ['name', 'settings', 'policy'],
                properties: {
                    name: { type: 'string' },
                    active: { type: 'boolean' },
                    description: { type: 'string' },
                    settings: { type: 'object' },
                    policy: { type: 'object' }
                }
            }
        }
    }, async (request, reply) => {
        // Currently only admins can create a template
        try {
            const templateSettings = app.db.controllers.ProjectTemplate.validateSettings(request.body.settings)
            const templateProperties = {
                name: request.body.name,
                active: request.body.active !== undefined ? request.body.active : undefined,
                description: request.body.description || '',
                settings: templateSettings,
                policy: request.body.policy
            }
            const template = await app.db.models.ProjectTemplate.create(templateProperties)
            template.setOwner(request.session.User)
            await template.save()

            const response = app.db.views.ProjectTemplate.templateSummary(template)
            reply.send(response)
        } catch (err) {
            let responseMessage
            if (err.errors) {
                responseMessage = err.errors.map(err => err.message).join(',')
            } else {
                responseMessage = err.toString()
            }
            reply.code(400).send({ code: 'unexpected_error', error: responseMessage })
        }
    })

    /**
     * Delete a template
     * @name /api/v1/templates
     * @static
     * @memberof forge.routes.api.templates
     */
    app.delete('/:templateId', {
        preHandler: app.needsPermission('template:delete')
    }, async (request, reply) => {
        const template = await app.db.models.ProjectTemplate.byId(request.params.templateId)
        // The `beforeDestroy` hook of the ProjectTemplate model ensures
        // we don't delete an in-use template
        try {
            await template.destroy()
            reply.send({ status: 'okay' })
        } catch (err) {
            reply.code(400).send({ code: 'unexpected_error', error: err.toString() })
        }
    })

    /**
     * Update a template
     * @name /api/v1/templates
     * @static
     * @memberof forge.routes.api.templates
     */
    app.put('/:templateId', {
        preHandler: app.needsPermission('template:edit')
    }, async (request, reply) => {
        const templateSettings = app.db.controllers.ProjectTemplate.validateSettings(request.body.settings)
        const template = await app.db.models.ProjectTemplate.byId(request.params.templateId)
        template.name = request.body.name
        template.description = request.body.description
        template.active = request.body.active !== undefined ? request.body.active : undefined
        if (templateSettings.httpNodeAuth?.pass) {
            if (templateSettings.httpNodeAuth.pass === true) {
                // Copy over the existing value (if there is one)
                if (template.settings.httpNodeAuth?.pass) {
                    templateSettings.httpNodeAuth.pass = template.settings.httpNodeAuth.pass
                }
            }
        }
        template.settings = templateSettings
        template.policy = request.body.policy
        await template.save()

        const response = app.db.views.ProjectTemplate.templateSummary(template)
        reply.send(response)
    })
}
