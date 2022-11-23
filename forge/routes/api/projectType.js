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
    app.get('/', {
        preHandler: app.needsPermission('project-type:list')
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
    app.get('/:projectTypeId', {
        preHandler: app.needsPermission('project-type:read')
    }, async (request, reply) => {
        const projectType = await app.db.models.ProjectType.byId(request.params.projectTypeId)
        if (projectType) {
            reply.send(app.db.views.ProjectType.projectType(projectType, request.session.User.admin))
        } else {
            reply.code(404).send({ code: 'not_found', error: 'Not Found' })
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
            await app.auditLog.Platform.platform.projectType.created(request.session.User, null, projectType)
            const response = app.db.views.ProjectType.projectType(projectType, true)
            reply.send(response)
        } catch (err) {
            let responseMessage
            if (err.errors) {
                responseMessage = err.errors.map(err => err.message).join(',')
            } else {
                responseMessage = err.toString()
            }
            const resp = { code: 'unexpected_error', error: responseMessage }
            await app.auditLog.Platform.platform.projectType.created(request.session.User, resp, properties)
            reply.code(400).send(resp)
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
        const updates = new app.auditLog.formatters.UpdatesCollection()
        if (inUse && request.body.properties) {
            // Don't allow the properties to be edited - this contains the billing
            // information and we don't want to have to update live projects
            reply.code(400).send({ code: 'invalid_request', error: 'Cannot edit in-use ProjectType' })
            return
        }
        try {
            const hasValueChanged = (requestProp, existingProp) => (requestProp !== undefined && existingProp !== requestProp)
            if (hasValueChanged(request.body.name, projectType.name)) {
                updates.push('name', request.body.name)
                projectType.name = request.body.name
            }
            if (hasValueChanged(request.body.description, projectType.description)) {
                updates.push('description', request.body.description)
                projectType.description = request.body.description
            }
            if (hasValueChanged(request.body.active, projectType.active)) {
                updates.push('active', request.body.active)
                projectType.active = request.body.active
            }
            if (request.body.properties !== undefined) {
                try {
                    const oldProps = {}
                    const newProps = {}
                    oldProps.properties = typeof projectType.properties === 'string' ? JSON.parse(projectType.properties) : projectType.properties
                    newProps.properties = typeof request.body.properties === 'string' ? JSON.parse(request.body.properties) : request.body.properties
                    updates.pushDifferences(oldProps, newProps)
                } catch (_error) {
                    // Ignore
                }
                projectType.properties = request.body.properties
            }
            if (hasValueChanged(request.body.order, projectType.order)) {
                updates.push('order', request.body.order)
                projectType.order = request.body.order
            }
            if (request.body.defaultStack) {
                const defaultStackId = app.db.models.ProjectStack.decodeHashid(request.body.defaultStack)
                if (defaultStackId) {
                    if (hasValueChanged(defaultStackId, projectType.defaultStackId)) {
                        updates.push('defaultStackId', defaultStackId)
                    }
                    projectType.defaultStackId = defaultStackId
                }
            }
            await projectType.save()
            await app.auditLog.Platform.platform.projectType.updated(request.session.User, null, projectType, updates)
            reply.send(app.db.views.ProjectType.projectType(projectType, request.session.User.admin))
        } catch (err) {
            let responseMessage
            if (err.errors) {
                responseMessage = err.errors.map(err => err.message).join(',')
            } else {
                responseMessage = err.toString()
            }
            const resp = { code: 'unexpected_error', error: responseMessage }
            await app.auditLog.Platform.platform.projectType.updated(request.session.User, resp, projectType, updates)
            reply.code(400).send(resp)
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
                await app.auditLog.Platform.platform.projectType.deleted(request.session.User, null, projectType)
                reply.send({ status: 'okay' })
            } catch (err) {
                const resp = { code: 'unexpected_error', error: err.toString() }
                await app.auditLog.Platform.platform.projectType.deleted(request.session.User, resp, projectType)
                reply.code(400).send(resp)
            }
        } else {
            reply.code(404).send({ code: 'not_found', status: 'Not Found' })
        }
    })
}
