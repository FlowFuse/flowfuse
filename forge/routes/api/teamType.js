/**
 * Team Type api routes
 *
 * - /api/v1/team-types
 *
 */
module.exports = async function (app) {
    /**
     * Get a list of available team types
     * /api/v1/team-types/
     */
    app.get('/', {
        preHandler: app.needsPermission('team-type:list'),
        schema: {
            summary: 'Get a list of the team types',
            tags: ['Team Types'],
            query: { $ref: 'PaginationParams' },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        meta: { $ref: 'PaginationMeta' },
                        count: { type: 'number' },
                        types: { $ref: 'TeamTypeList' }
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
        const teamTypes = await app.db.models.TeamType.getAll(paginationOptions, filter)
        teamTypes.types = teamTypes.types.map(pt => app.db.views.TeamType.teamType(pt, request.session.User.admin))
        reply.send(teamTypes)
    })

    /**
     * Get the details of a team type
     * /api/v1/team-types/:teamTypeId
     */
    app.get('/:teamTypeId', {
        preHandler: app.needsPermission('team-type:read'),
        schema: {
            summary: 'Get details of a team type',
            tags: ['Teams'],
            params: {
                type: 'object',
                properties: {
                    teamTypeId: { type: 'string' }
                }
            },
            response: {
                200: {
                    $ref: 'TeamType'
                },
                '4xx': {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        const teamType = await app.db.models.TeamType.byId(request.params.teamTypeId)
        if (!teamType) {
            reply.code(404).send({ code: 'not_found', error: 'Not Found' })
            return
        }
        const response = app.db.views.TeamType.teamType(teamType, request.session.User.admin)
        reply.send(response)
    })

    /**
     * Create a Team Type
     * /api/v1/project-types
     */
    app.post('/', {
        preHandler: app.needsPermission('team-type:create'),
        schema: {
            summary: 'Create a team type - admin-only',
            tags: ['Team Types'],
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
            },
            response: {
                200: {
                    $ref: 'TeamType'
                },
                '4xx': {
                    $ref: 'APIError'
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
            const teamType = await app.db.models.TeamType.create(properties)
            // TODO: platform audit log
            // await app.auditLog.Platform.platform.projectType.created(request.session.User, null, projectType)
            const response = app.db.views.TeamType.teamType(teamType, true)
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
     * Update a team type
     * /api/v1/team-types/:teamTypeId
     */
    app.put('/:teamTypeId', {
        preHandler: app.needsPermission('team-type:edit'),
        schema: {
            summary: 'Update a team type - admin-only',
            tags: ['Team Types'],
            params: {
                type: 'object',
                properties: {
                    teamTypeId: { type: 'string' }
                }
            },
            body: {
                type: 'object',
                properties: {
                    name: { type: 'string' },
                    description: { type: 'string' },
                    active: { type: 'boolean' },
                    properties: { type: 'object' },
                    order: { type: 'number' }
                }
            },
            response: {
                200: {
                    $ref: 'TeamType'
                },
                '4xx': {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        const teamType = await app.db.models.TeamType.byId(request.params.teamTypeId)
        if (!teamType) {
            reply.code(404).send({ code: 'not_found', error: 'Not Found' })
            return
        }

        // TODO: guard against in-use editing
        // const inUse = teamType.getDataValue('teamCount') > 0
        const updates = new app.auditLog.formatters.UpdatesCollection()
        // if (inUse && request.body.properties) {
        // // Don't allow the properties to be edited - this contains the billing
        // // information and we don't want to have to update live projects
        //     reply.code(400).send({ code: 'invalid_request', error: 'Cannot edit in-use ProjectType' })
        //     return
        // }
        try {
            const hasValueChanged = (requestProp, existingProp) => (requestProp !== undefined && existingProp !== requestProp)
            if (hasValueChanged(request.body.name, teamType.name)) {
                updates.push('name', request.body.name)
                teamType.name = request.body.name
            }
            if (hasValueChanged(request.body.description, teamType.description)) {
                updates.push('description', request.body.description)
                teamType.description = request.body.description
            }
            if (hasValueChanged(request.body.active, teamType.active)) {
                updates.push('active', request.body.active)
                teamType.active = request.body.active
            }
            if (hasValueChanged(request.body.order, teamType.order)) {
                updates.push('order', request.body.order)
                teamType.order = request.body.order
            }
            if (request.body.properties !== undefined) {
                try {
                    const oldProps = {}
                    const newProps = {}
                    oldProps.properties = typeof teamType.properties === 'string' ? JSON.parse(teamType.properties) : teamType.properties
                    newProps.properties = typeof request.body.properties === 'string' ? JSON.parse(request.body.properties) : request.body.properties
                    updates.pushDifferences(oldProps, newProps)
                } catch (_error) {
                // Ignore
                }
                teamType.properties = request.body.properties
            }
            await teamType.save()
            // TODO: audit log
            // await app.auditLog.Platform.platform.projectType.updated(request.session.User, null, projectType, updates)
            reply.send(app.db.views.TeamType.teamType(teamType, request.session.User.admin))
        } catch (err) {
            let responseMessage
            if (err.errors) {
                responseMessage = err.errors.map(err => err.message).join(',')
            } else {
                responseMessage = err.toString()
            }
            const resp = { code: 'unexpected_error', error: responseMessage }
            // TODO: audit log
            // await app.auditLog.Platform.platform.projectType.updated(request.session.User, resp, projectType, updates)
            reply.code(400).send(resp)
        }
    })

    /**
     * Delete a project type
     * /api/v1/team-types/:teamTypeId
     */
    app.delete('/:teamTypeId', {
        preHandler: app.needsPermission('team-type:delete'),
        schema: {
            summary: 'Delete a team type - admin-only',
            tags: ['Team Types'],
            params: {
                type: 'object',
                properties: {
                    teamTypeId: { type: 'string' }
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
        const teamType = await app.db.models.TeamType.byId(request.params.teamTypeId)
        // The `beforeDestroy` hook of the TeamType model ensures
        // we don't delete an in-use type
        if (teamType) {
            try {
                await teamType.destroy()
                // TODO: audit log
                // await app.auditLog.Platform.platform.projectType.deleted(request.session.User, null, projectType)
                reply.send({ status: 'okay' })
            } catch (err) {
                const resp = { code: 'unexpected_error', error: err.toString() }
                // TODO: audit log
                // await app.auditLog.Platform.platform.projectType.deleted(request.session.User, resp, projectType)
                reply.code(400).send(resp)
            }
        } else {
            reply.code(404).send({ code: 'not_found', status: 'Not Found' })
        }
    })
}
