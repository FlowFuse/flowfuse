module.exports = async function (app) {
    app.addHook('preHandler', app.verifySession)
    app.addHook('preHandler', async (request, reply) => {
        if (!app.config.features.enabled('protectedInstance')) {
            reply.code(404).send({ code: 'not_found', error: 'Not Found' })
        }
    })
    app.addHook('preHandler', async (request, reply) => {
        if (request.params.projectId !== undefined) {
            if (request.params.projectId) {
                try {
                    request.project = await app.db.models.Project.byId(request.params.projectId)
                    if (!request.project) {
                        reply.code(404).send({ code: 'not_found', error: 'Not Found' })
                        return
                    }
                    const teamType = await request.project.Team.getTeamType()
                    if (!teamType.getFeatureProperty('protectedInstance', true)) {
                        reply.code(404).send({ code: 'not_found', error: 'Not Found' })
                        return // eslint-disable-line no-useless-return
                    }
                    if (request.session.User) {
                        request.teamMembership = await request.session.User.getTeamMembership(request.project.Team.id)
                        if (!request.teamMembership && !request.session.User.admin) {
                            reply.code(404).send({ code: 'not_found', error: 'Not Found' })
                            return // eslint-disable-line no-useless-return
                        }
                    } else if (request.session.ownerId !== request.params.projectId) {
                        // AccessToken being used - but not owned by this project
                        reply.code(404).send({ code: 'not_found', error: 'Not Found' })
                        return // eslint-disable-line no-useless-return
                    }
                } catch (err) {
                    reply.code(404).send({ code: 'not_found', error: 'Not Found' })
                }
            } else {
                reply.code(404).send({ code: 'not_found', error: 'Not Found' })
            }
        }
    })

    app.get('/', {
        preHandler: app.needsPermission('project:read')
    }, async (request, reply) => {
        reply.send(await request.project.getProtectedInstanceState() || {})
    })

    app.put('/', {
        preHandler: app.needsPermission('project:edit')
    }, async (request, reply) => {
        await request.project.updateProtectedInstanceState({ enabled: request.body.enabled || {} })
        if (request.body?.enabled) {
            await app.auditLog.Project.project.protected(request.session.User, null, request.project)
        } else {
            await app.auditLog.Project.project.unprotected(request.session.User, null, request.project)
        }
        reply.send(await request.project.getProtectedInstanceState() || { enabled: false })
    })

    app.delete('/', {
        preHandler: app.needsPermission('project:edit')
    }, async (request, reply) => {
        const existingProtected = await request.project.getProtectedInstanceState() || {}
        if (Object.hasOwn(existingProtected, 'enabled')) {
            await app.auditLog.Project.project.unprotected(request.session.User, null, request.project)
            await request.project.updateProtectedInstanceState(undefined)
        } else {
            reply.send({})
        }
    })
}
