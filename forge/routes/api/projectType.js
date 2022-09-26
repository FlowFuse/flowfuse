/**
 * Project Type api routes
 *
 * - /api/v1/project-types
 *
 * @namespace projectTypes
 * @memberof forge.routes.api
 */
module.exports = async function (app) {
    /**
     * Get a list of all project types
     * @name /api/v1/project-types/
     * @static
     * @memberof forge.routes.api.projectTypes
     */
    app.get('/', async (request, reply) => {
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
        const projectTypes = await app.db.models.ProjectType.getAll(paginationOptions, filter)
        projectTypes.types = projectTypes.types.map(pt => app.db.views.ProjectType.projectType(pt, request.session.User.admin))
        reply.send(projectTypes)
    })

    /**
     * Get the details of a ProjectType
     * @name /api/v1/project-types/:id
     * @static
     * @memberof forge.routes.api.projectTypes
     */
    app.get('/:projectTypeId', async (request, reply) => {
        const projectType = await app.db.models.ProjectType.byId(request.params.projectTypeId)
        if (projectType) {
            reply.send(app.db.views.ProjectType.projectType(projectType, request.session.User.admin))
        } else {
            reply.code(404).type('text/html').send('Not Found')
        }
    })

    /**
     * Create a projectType
     * @name /api/v1/project-types
     * @static
     * @memberof forge.routes.api.projectTypes
     */
    app.post('/', {
        preHandler: app.needsPermission('project-type:create'),
        schema: {
            body: {
                type: 'object',
                required: ['name'],
                properties: {
                    name: { type: 'string' },
                    description: { type: 'string' },
                    active: { type: 'boolean' },
                    properties: { type: 'object' },
                    order: { type: 'number' }
                }
            }
        }
    }, async (request, reply) => {
        // Only admins can create a projectType
        const properties = {
            name: request.body.name,
            description: request.body.description,
            active: request.body.active !== undefined ? request.body.active : undefined,
            properties: request.body.properties,
            order: request.body.order
        }
        try {
            const projectType = await app.db.models.ProjectType.create(properties)
            const response = app.db.views.ProjectType.projectType(projectType, true)
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
     * Update a project type
     * @name /api/v1/project-types
     * @static
     * @memberof forge.routes.api.projectTypes
     */
    app.put('/:projectTypeId', {
        preHandler: app.needsPermission('project-type:edit')
    }, async (request, reply) => {
        const projectType = await app.db.models.ProjectType.byId(request.params.projectTypeId)

        const inUse = projectType.getDataValue('projectCount') > 0

        if (inUse && request.body.properties) {
            // Don't allow the properties to be edited - this contains the billing
            // information and we don't want to have to update live projects
            reply.code(400).send({ code: 'invalid_request', error: 'Cannot edit in-use ProjectType' })
            return
        }
        try {
            if (request.body.name !== undefined) {
                projectType.name = request.body.name
            }
            if (request.body.description !== undefined) {
                projectType.description = request.body.description
            }
            if (request.body.active !== undefined) {
                projectType.active = request.body.active
            }
            if (request.body.properties !== undefined) {
                projectType.properties = request.body.properties
            }
            if (request.body.order !== undefined) {
                projectType.order = request.body.order
            }
            if (request.body.defaultStack) {
                const defaultStack = app.db.models.ProjectStack.decodeHashid(request.body.defaultStack)
                if (defaultStack) {
                    projectType.defaultStackId = defaultStack
                }
            }
            await projectType.save()
            reply.send(app.db.views.ProjectType.projectType(projectType, request.session.User.admin))
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
     * Delete a project type
     * @name /api/v1/project-types
     * @static
     * @memberof forge.routes.api.projectTypes
     */
    app.delete('/:projectTypeId', {
        preHandler: app.needsPermission('project-type:delete')
    }, async (request, reply) => {
        const projectType = await app.db.models.ProjectType.byId(request.params.projectTypeId)
        // The `beforeDestroy` hook of the ProjectType model ensures
        // we don't delete an in-use stack
        if (projectType) {
            try {
                await projectType.destroy()
                reply.send({ status: 'okay' })
            } catch (err) {
                reply.code(400).send({ code: 'unexpected_error', error: err.toString() })
            }
        } else {
            reply.code(404).send({ code: 'not_found', status: 'Not Found' })
        }
    })
}
