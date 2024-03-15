module.exports = async function (app) {
    app.config.features.register('httpBearerTokens', true, true)

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
                    if (!teamType.getFeatureProperty('teamHttpSecurity', false)) {
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
        try {
            const body = request.body
            const token = await app.db.controllers.AccessToken.createHTTPNodeToken(request.project, body.name, body.scope, body.expiresAt)
            await app.auditLog.Project.project.httpToken.created(request.session.User, null, request.project, body)
            reply.send(token || {})
        } catch (err) {
            const resp = { code: 'unexpected_error', error: err.toString() }
            reply.code(400).send(resp)
        }
    })

    app.put('/:id', {
        preHandler: app.needsPermission('project:edit')
    }, async (request, reply) => {
        const updates = new app.auditLog.formatters.UpdatesCollection()
        try {
            const id = isNaN(parseInt(request.params.id)) ? request.params.id : parseInt(request.params.id)
            const oldToken = await app.db.models.AccessToken.byId(id)
            const body = request.body
            const token = await app.db.controllers.AccessToken.updateHTTPNodeToken(request.project, request.params.id, body.scope, body.expiresAt)
            updates.pushDifferences({ expiresAt: oldToken.expiresAt, scope: oldToken.scope.join(',') }, { expiresAt: body.expiresAt, scope: body.scope })
            await app.auditLog.Project.project.httpToken.updated(request.session.User, null, request.project, updates)
            delete token.token
            reply.send(token || {})
        } catch (err) {
            const resp = { code: 'unexpected_error', error: err.toString() }
            reply.code(400).send(resp)
        }
    })

    app.delete('/:id', {
        preHandler: app.needsPermission('project:edit')
    }, async (request, reply) => {
        try {
            const id = isNaN(parseInt(request.params.id)) ? request.params.id : parseInt(request.params.id)
            const oldToken = await app.db.models.AccessToken.byId(id)
            await app.db.controllers.AccessToken.revokeHTTPNodeToken(request.project, request.params.id)
            await app.auditLog.Project.project.httpToken.deleted(request.session.User, null, request.project, { name: oldToken.name })
            reply.code(201).send()
        } catch (err) {
            const resp = { code: 'unexpected_error', error: err.toString() }
            reply.code(400).send(resp)
        }
    })
}
