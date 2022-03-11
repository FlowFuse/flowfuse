/**
 * Project stack api routes
 *
 * - /api/v1/stacks
 *
 * @namespace stacks
 * @memberof forge.routes.api
 */
module.exports = async function (app) {
    /**
     * Get a list of all stacks
     * @name /api/v1/stacks/:id
     * @static
     * @memberof forge.routes.api.stacks
     */
    app.get('/', async (request, reply) => {
        const paginationOptions = app.getPaginationOptions(request)
        const stacks = await app.db.models.ProjectStack.getAll(paginationOptions)
        stacks.stacks = stacks.stacks.map(s => app.db.views.ProjectStack.stack(s))
        reply.send(stacks)
    })

    /**
     * Get the details of a stack
     * @name /api/v1/stacks/:id
     * @static
     * @memberof forge.routes.api.stacks
     */
    app.get('/:stackId', async (request, reply) => {
        const stack = await app.db.models.ProjectStack.byId(request.params.stackId)
        if (stack) {
            reply.send(app.db.views.ProjectStack.stack(stack))
        } else {
            reply.code(404).type('text/html').send('Not Found')
        }
    })

    /**
     * Create a stack
     * @name /api/v1/stacks
     * @static
     * @memberof forge.routes.api.stacks
     */
    app.post('/', {
        preHandler: app.needsPermission('stack:create'),
        schema: {
            body: {
                type: 'object',
                required: ['name'],
                properties: {
                    name: { type: 'string' },
                    active: { type: 'boolean' },
                    properties: { type: 'object' }
                }
            }
        }
    }, async (request, reply) => {
        // Only admins can create a stack
        const stackProperties = {
            name: request.body.name,
            active: request.body.active !== undefined ? request.body.active : undefined,
            properties: request.body.properties
        }
        try {
            const stack = await app.db.models.ProjectStack.create(stackProperties)
            const response = app.db.views.ProjectStack.stack(stack)
            response.projectCount = 0
            reply.send(response)
        } catch (err) {
            let responseMessage
            if (err.errors) {
                responseMessage = err.errors.map(err => err.message).join(',')
            } else {
                responseMessage = err.toString()
            }
            reply.code(400).send({ error: responseMessage })
        }
    })

    /**
     * Delete a stack
     * @name /api/v1/stacks
     * @static
     * @memberof forge.routes.api.stacks
     */
    app.delete('/:stackId', {
        preHandler: app.needsPermission('stack:delete')
    }, async (request, reply) => {
        const stack = await app.db.models.ProjectStack.byId(request.params.stackId)
        // The `beforeDestroy` hook of the ProjectStack model ensures
        // we don't delete an in-use stack
        try {
            await stack.destroy()
            reply.send({ status: 'okay' })
        } catch (err) {
            reply.code(400).send({ error: err.toString() })
        }
    })

    /**
     * Update a stack
     * @name /api/v1/stacks
     * @static
     * @memberof forge.routes.api.stacks
     */
    app.put('/:stackId', {
        preHandler: app.needsPermission('stack:edit')
    }, async (request, reply) => {
        const stack = await app.db.models.ProjectStack.byId(request.params.stackId)
        if (stack.projectCount > 0) {
            reply.code(400).send({ error: 'Cannot edit in-use stack' })
        } else {
            if (request.body.name !== undefined) {
                stack.name = request.body.name
            }
            if (request.body.active !== undefined) {
                stack.active = request.body.active
            }
            if (request.body.properties !== undefined) {
                stack.properties = request.body.properties
            }
            await stack.save()
            reply.send(app.db.views.ProjectStack.stack(stack))
        }
    })
}
