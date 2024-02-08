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
     * @name /api/v1/stacks/
     * @static
     * @memberof forge.routes.api.stacks
     */
    app.get('/', {
        preHandler: app.needsPermission('stack:list'),
        schema: {
            summary: 'Get a list of all stacks',
            tags: ['Stacks'],
            query: {
                allOf: [
                    { $ref: 'PaginationParams' },
                    {
                        type: 'object',
                        properties: {
                            filter: { type: 'string' }
                        }
                    }
                ]
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        meta: { $ref: 'PaginationMeta' },
                        count: { type: 'number' },
                        stacks: { type: 'array', items: { $ref: 'Stack' } }
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
        } else if (/^replacedBy:/.test(request.query.filter)) {
            const filterStack = app.db.models.ProjectStack.decodeHashid(request.query.filter.substring(11))
            filter = { replacedBy: filterStack || 0 }
        }
        if (request.query.projectType) {
            const projectTypeId = app.db.models.ProjectType.decodeHashid(request.query.projectType)
            if (projectTypeId && projectTypeId.length > 0) {
                filter.ProjectTypeId = projectTypeId[0]
            } else {
                // An invalid ProjectTypeID; return empty set of stacks
                reply.send({
                    meta: {},
                    count: 0,
                    stacks: []
                })
                return
            }
        }
        const stacks = await app.db.models.ProjectStack.getAll(paginationOptions, filter)
        stacks.stacks = stacks.stacks.map(s => app.db.views.ProjectStack.stack(s, request.session.User.admin))
        reply.send(stacks)
    })

    /**
     * Get the details of a stack
     * @name /api/v1/stacks/:id
     * @static
     * @memberof forge.routes.api.stacks
     */
    app.get('/:stackId', {
        preHandler: app.needsPermission('stack:read'),
        schema: {
            summary: 'Get details of a stacks',
            tags: ['Stacks'],
            params: {
                type: 'object',
                properties: {
                    stackId: { type: 'string' }
                }
            },
            response: {
                200: {
                    $ref: 'Stack'
                },
                '4xx': {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        const stack = await app.db.models.ProjectStack.byId(request.params.stackId)
        if (stack) {
            reply.send(app.db.views.ProjectStack.stack(stack, request.session.User.admin))
        } else {
            reply.code(404).send({ code: 'not_found', error: 'Not Found' })
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
            summary: 'Create a stack - admin-only',
            tags: ['Stacks'],
            body: {
                type: 'object',
                required: ['name'],
                properties: {
                    name: { type: 'string' },
                    label: { type: 'string' },
                    active: { type: 'boolean' },
                    projectType: { type: 'string' },
                    properties: { type: 'object' },
                    replaces: { type: 'string' }
                }
            },
            response: {
                200: {
                    $ref: 'Stack'
                },
                '4xx': {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        // Only admins can create a stack
        const stackProperties = {
            name: request.body.name,
            label: request.body.label,
            active: request.body.active !== undefined ? request.body.active : undefined,
            properties: request.body.properties,
            ProjectTypeId: app.db.models.ProjectType.decodeHashid(request.body.projectType)[0] || undefined
        }
        try {
            let replacedStack
            if (request.body.replace) {
                replacedStack = await app.db.models.ProjectStack.byId(request.body.replace)
                if (!replacedStack) {
                    reply.code(400).send({ code: 'invalid_stack', error: 'unknown replace stack' })
                    return
                } else if (replacedStack.getDataValue('replacedBy')) {
                    reply.code(400).send({ code: 'invalid_request', error: 'stack already replaced' })
                    return
                } else if (replacedStack.ProjectTypeId !== stackProperties.ProjectTypeId) {
                    reply.code(400).send({ code: 'invalid_request', error: 'cannot replace stack with different project type' })
                    return
                }
                // log the change of active state in audit
                const updates = new app.auditLog.formatters.UpdatesCollection()
                updates.push('active', true, false)
                await app.auditLog.Platform.platform.stack.updated(request.session.User, null, replacedStack, updates)
            }
            const stack = await app.db.models.ProjectStack.create(stackProperties)

            await app.auditLog.Platform.platform.stack.created(request.session.User, null, stack)
            if (replacedStack) {
                // Update all previous stacks to point to the latest in the chain
                await app.db.models.ProjectStack.update({ replacedBy: stack.id }, {
                    where: {
                        replacedBy: replacedStack.id
                    }
                })
                // Update all ProjectTypes that have this as their defaultStack
                await app.db.models.ProjectType.update({ defaultStackId: stack.id }, {
                    where: {
                        defaultStackId: replacedStack.id
                    }
                })
                replacedStack.active = false
                replacedStack.replacedBy = stack.id
                await replacedStack.save()
            }
            const response = app.db.views.ProjectStack.stack(stack)
            response.instanceCount = 0
            reply.send(response)
        } catch (err) {
            let responseMessage
            if (err.errors) {
                responseMessage = err.errors.map(err => err.message).join(',')
            } else {
                responseMessage = err.toString()
            }
            const resp = { code: 'unexpected_error', error: responseMessage }
            await app.auditLog.Platform.platform.stack.created(request.session.User, resp, stackProperties)
            reply.code(400).send(resp)
        }
    })

    /**
     * Delete a stack
     * @name /api/v1/stacks
     * @static
     * @memberof forge.routes.api.stacks
     */
    app.delete('/:stackId', {
        preHandler: app.needsPermission('stack:delete'),
        schema: {
            summary: 'Delete a stack - admin-only',
            tags: ['Stacks'],
            params: {
                type: 'object',
                properties: {
                    stackId: { type: 'string' }
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
        const stack = await app.db.models.ProjectStack.byId(request.params.stackId)
        // The `beforeDestroy` hook of the ProjectStack model ensures
        // we don't delete an in-use stack or one that is flagged as a replacedBy stack
        if (stack) {
            try {
                await stack.destroy()
                await app.auditLog.Platform.platform.stack.deleted(request.session.User, null, stack)
                reply.send({ status: 'okay' })
            } catch (err) {
                reply.code(400).send({ code: 'unexpected_error', error: err.toString() })
            }
        } else {
            const resp = { code: 'not_found', status: 'Not Found' }
            await app.auditLog.Platform.platform.stack.deleted(request.session.User, resp, stack)
            reply.code(404).send(resp)
        }
    })

    /**
     * Update a stack
     * @name /api/v1/stacks
     * @static
     * @memberof forge.routes.api.stacks
     */
    app.put('/:stackId', {
        preHandler: app.needsPermission('stack:edit'),
        schema: {
            summary: 'Update details of a stack - admin-only',
            tags: ['Stacks'],
            params: {
                type: 'object',
                properties: {
                    stackId: { type: 'string' }
                }
            },
            body: {
                type: 'object',
                properties: {
                    name: { type: 'string' },
                    label: { type: 'string' },
                    active: { type: 'boolean' },
                    projectType: { type: 'string' },
                    properties: { type: 'object' }
                }
            },
            response: {
                200: {
                    $ref: 'Stack'
                },
                '4xx': {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        const stack = await app.db.models.ProjectStack.byId(request.params.stackId)
        if (request.body.name !== undefined || request.body.properties !== undefined) {
            if (stack.getDataValue('projectCount') > 0) {
                const resp = { code: 'invalid_request', error: 'Cannot edit in-use stack' }
                await app.auditLog.Platform.platform.stack.updated(request.session.User, resp, stack)
                reply.code(400).send(resp)
                return
            }
        }
        const updates = new app.auditLog.formatters.UpdatesCollection()
        if (request.body.projectType) {
            const projectTypeId = app.db.models.ProjectType.decodeHashid(request.body.projectType)
            if (!stack.ProjectTypeId) {
                // This is assigning the stack to a project type for the first time
                // We'll allow that as part of the migration of legacy stacks
                if (projectTypeId && projectTypeId.length > 0) {
                    stack.ProjectTypeId = projectTypeId[0]
                    updates.push('ProjectTypeId', null, projectTypeId[0], 'created')
                    // We can also assign any projects using this stack to the same project-type
                    await app.db.models.Project.update({ ProjectTypeId: projectTypeId[0] }, {
                        where: {
                            ProjectStackId: stack.id
                        }
                    })
                } else {
                    reply.code(400).send({ code: 'invalid_request', error: 'Invalid projectType' })
                    return
                }
            } else if (stack.ProjectTypeId !== projectTypeId[0]) {
                reply.code(400).send({ code: 'invalid_request', error: 'Cannot change stack project type' })
                return
            }
        }

        if (request.body.name !== undefined && stack.name !== request.body.name) {
            updates.push('name', stack.name, request.body.name)
            stack.name = request.body.name
        }
        if (request.body.label !== undefined && stack.label !== request.body.label) {
            updates.push('label', stack.label, request.body.label)
            stack.label = request.body.label
        }
        if (request.body.active !== undefined && stack.active !== request.body.active) {
            updates.push('active', stack.active, request.body.active)
            stack.active = request.body.active
        }
        if (request.body.properties !== undefined && stack.properties !== request.body.properties) {
            updates.pushDifferences({ properties: stack.properties }, { properties: request.body.properties })
            stack.properties = request.body.properties
        }

        await stack.save()
        await app.auditLog.Platform.platform.stack.updated(request.session.User, null, stack, updates)
        reply.send(app.db.views.ProjectStack.stack(stack, request.session.User.admin))
    })
}
