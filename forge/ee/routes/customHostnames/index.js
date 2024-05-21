module.exports = async function (app) {
    app.log.debug('registering custom hostname routes')
    app.addHook('preHandler', app.verifySession)
    app.addHook('preHandler', async (request, reply) => {
        app.log.debug('custom hostname feature enabled pre-handler')
        if (!app.config.features.enabled('customHostnames')) {
            reply.code(404).send({ code: 'not_found', error: 'Not Found' })
            return
        }
        app.log.debug('custom hostname feature enabled pre-handler passed')
    })
    app.addHook('preHandler', async (request, reply) => {
        app.log.debug('custom hostname auth pre-handler')
        if (request.params.projectId !== undefined) {
            if (request.params.projectId) {
                try {
                    request.project = await app.db.models.Project.byId(request.params.projectId)
                    if (!request.project) {
                        reply.code(404).send({ code: 'not_found', error: 'Not Found' })
                        app.log.debug('custom hostname auth pre-handler 1')
                        return
                    }
                    const teamType = await request.project.Team.getTeamType()
                    if (!teamType.getFeatureProperty('customHostnames', true)) {
                        reply.code(404).send({ code: 'not_found', error: 'Not Found' })
                        app.log.debug('custom hostname auth pre-handler 2')
                        return // eslint-disable-line no-useless-return
                    }
                    if (request.session.User) {
                        request.teamMembership = await request.session.User.getTeamMembership(request.project.Team.id)
                        if (!request.teamMembership && !request.session.User.admin) {
                            reply.code(404).send({ code: 'not_found', error: 'Not Found' })
                            app.log.debug('custom hostname auth pre-handler 3')
                            return // eslint-disable-line no-useless-return
                        }
                    } else if (request.session.ownerId !== request.params.projectId) {
                        // AccessToken being used - but not owned by this project
                        reply.code(404).send({ code: 'not_found', error: 'Not Found' })
                        app.log.debug('custom hostname auth pre-handler 4')
                        return // eslint-disable-line no-useless-return
                    }
                } catch (err) {
                    reply.code(404).send({ code: 'not_found', error: 'Not Found' })
                    app.log.debug('custom hostname auth pre-handler 5')
                }
            } else {
                reply.code(404).send({ code: 'not_found', error: 'Not Found' })
                app.log.debug('custom hostname auth pre-handler 6')
            }
            app.log.debug('custom hostname auth pre-handler passed')
        }
    })

    app.get('/', {
        preHandler: app.needsPermission('project:edit')
    }, async (request, reply) => {
        reply.send(await request.project.getCustomHostname() || {})
    })

    app.put('/', {
        preHandler: app.needsPermission('project:edit')
    }, async (request, reply) => {
        if (request.body.hostname) {
            try {
                await request.project.setCustomHostname(request.body.hostname)
                reply.send({hostname: request.body.hostname})
            } catch (err) {
                reply.code(409).send({ code: 'hostname_node_available', error: 'Hostname not available'})
            }
        } else {
            reply.code(400).send({})
        }
    })

    app.delete('/', {
        preHandler: app.needsPermission('project:edit')
    }, async (request, reply) => {
        await request.project.clearCustomHostname()
        reply.status(204).send({})
    })
}
