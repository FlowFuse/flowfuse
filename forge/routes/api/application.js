
module.exports = async function (app) {
    app.addHook('preHandler', async (request, reply) => {
        const applicationId = request.params.applicationId
        if (applicationId === undefined) {
            return
        }

        if (!applicationId) {
            return reply.code(404).send({ code: 'not_found', error: 'Not Found' })
        }

        try {
            request.application = await app.db.models.Application.byId(applicationId)
            if (!request.application) {
                return reply.code(404).send({ code: 'not_found', error: 'Not Found' })
            }

            if (request.session.User) {
                request.teamMembership = await request.session.User.getTeamMembership(request.application.Team.id)
                if (!request.teamMembership && !request.session.User.admin) {
                    return reply.code(404).send({ code: 'not_found', error: 'Not Found' })
                }
            }
        } catch (err) {
            return reply.code(500).send({ code: 'unexpected_error', error: err.toString() })
        }
    })

    /**
     * Create an application
     * @name /api/v1/application
     * @memberof forge.routes.api.application
     */
    app.post('/', {
        preHandler: [
            async (request, reply) => {
                request.teamMembership = await request.session.User.getTeamMembership(request.body.teamId)
                if (!request.teamMembership) {
                    return reply.code(401).send({ code: 'unauthorized', error: 'unauthorized' })
                }
            },
            app.needsPermission('project:create') // TODO Using project level permissions
        ],
        schema: {
            body: {
                type: 'object',
                required: ['name', 'teamId'],
                properties: {
                    name: { type: 'string' },
                    teamId: { anyOf: [{ type: 'string' }, { type: 'number' }] }
                }
            }
        }
    }, async (request, reply) => {
        const team = await request.teamMembership.getTeam()

        const name = request.body.name?.trim()
        if (name === '') {
            reply.status(409).type('application/json').send({ code: 'invalid_application_name', error: 'name must be set' })
            return
        }

        let application
        try {
            application = await app.db.models.Application.create({
                name,
                TeamId: team.id
            })
        } catch (err) {
            console.error(err)
            return reply.status(500).send({ code: 'unexpected_error', error: err.toString() })
        }

        reply.send(app.db.views.Application.application(application))
    })

    /**
     * Get the details of a given application
     * @name /api/v1/application/:applicationId
     * @static
     * @memberof forge.routes.api.application
     */
    app.get('/:applicationId', {
        preHandler: app.needsPermission('project:read') // TODO For now using project level permissions
    }, async (request, reply) => {
        reply.send(app.db.views.Application.application(request.application))
    })

    /**
     * Update an application
     * @name /api/v1/application/:id
     * @memberof forge.routes.api.application
     */
    app.put('/:applicationId', {
        preHandler: app.needsPermission('project:edit') // TODO For now sharing project permissions
    }, async (request, reply) => {
        try {
            const reqName = request.body.name?.trim()
            request.application.name = reqName

            await request.application.save()
        } catch (error) {
            app.log.error('Error while updating application:')
            app.log.error(error)

            return reply.code(500).send({ code: 'unexpected_error', error: error.toString() })
        }

        reply.send(app.db.views.Application.application(request.application))
    })

    /**
     * Delete a application
     * @name /api/v1/application/:id
     * @memberof forge.routes.api.application
     */
    app.delete('/:applicationId', {
        preHandler: app.needsPermission('project:delete') // TODO For now sharing project permissions
    }, async (request, reply) => {
        try {
            // TODO need to stop all project containers and delete the projects
            // For now, error if there are any projects
            if (await request.application.projectCount() > 0) {
                return reply.code(422).send({ code: 'invalid_application', error: 'All this applications projects must be deleted first' })
            }

            await request.application.destroy()

            reply.send({ status: 'okay' })
        } catch (err) {
            reply.code(500).send({ code: 'unexpected_error', error: err.toString() })
        }
    })

    /**
     * List Application instances
     * @name /api/v1/application/:id/instances
     * @memberof forge.routes.api.application
     */
    app.get('/:applicationId/instances', {
        // TODO: tidy up permissions
        preHandler: app.needsPermission('team:projects:list')
    }, async (request, reply) => {
        // Settings needed to be able to include the project URL in the response
        const instances = await app.db.models.Project.byApplication(request.application.hashid, { includeSettings: true })
        if (instances) {
            let result = await app.db.views.Project.instancesList(instances)
            if (request.session.ownerType === 'project') {
                // This request is from a project token. Filter the list to return
                // the minimal information needed
                result = result.map(e => {
                    return { id: e.id, name: e.name }
                })
            }
            reply.send({
                count: result.length,
                instances: result
            })
        } else {
            reply.code(404).send({ code: 'not_found', error: 'Not Found' })
        }
    })

    /**
     * List Application instances statuses
     * @name /api/v1/application/:id/instances/status
     * @memberof forge.routes.api.application
     */
    app.get('/:applicationId/instances/status', {
        // TODO: tidy up permissions
        preHandler: app.needsPermission('team:projects:list')
    }, async (request, reply) => {
        const instances = await app.db.models.Project.byApplication(request.application.hashid)
        if (instances) {
            const instanceStatuses = await Promise.all(
                instances.map((instance) =>
                    instance.liveState().then((state) => {
                        return { id: instance.id, ...state }
                    })
                )
            )
            reply.send({
                count: instanceStatuses.length,
                instances: instanceStatuses
            })
        } else {
            reply.code(404).send({ code: 'not_found', error: 'Not Found' })
        }
    })
}
