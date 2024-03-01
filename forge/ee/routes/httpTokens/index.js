module.exports = async function (app) {
    app.addHook('preHandler', app.verifySession)
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
                    if (!teamType.getFeatureProperty('ha', true)) {
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
        preHandler: app.needsPermission('project:edit')
    }, async (request, reply) => {
        const tokens = await app.db.models.AccessToken.getProjectHTTPTokens(request.project)
        reply.send(tokens || {})
    })

    app.post('/', {
        preHandler: app.needsPermission('project:edit')
    }, async (request, reply) => {
        const body = request.body
        const token = await app.db.controllers.AccessToken.createHTTPNodeToken(request.project, body.name, body.scope, body.expiresAt)
        reply.send(token || {})
    })

    app.put('/:id', {
        preHandler: app.needsPermission('project:edit')
    }, async (request, reply) => {
        const body = request.body
        const token = await app.db.controllers.AccessToken.updateHTTPNodeToken(request.project, request.params.id, body.scope, body.expiresAt)
        delete token.token
        reply.send(token || {})
    })

    app.delete('/:id', {
        preHandler: app.needsPermission('project:edit')
    }, async (request, reply) => {
        await app.db.controllers.AccessToken.revokeHTTPNodeToken(request.project, request.params.id)
        reply.send({})
    })
}
