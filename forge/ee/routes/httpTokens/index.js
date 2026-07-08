const { EXPERT_MCP_SCOPES } = require('../../lib/expert')

module.exports = async function (app) {
    app.config.features.register('httpBearerTokens', true, true)

    app.addHook('preHandler', app.verifySession)
    app.addHook('preHandler', async (request, reply) => {
        // This route is either under `/projects/:projectId/httpTokens' or '/devices/:deviceId/httpTokens'
        // The preHandler needs to handle both cases.
        if (request.params.projectId !== undefined) {
            if (request.params.projectId) {
                try {
                    request.project = await app.db.models.Project.byId(request.params.projectId)
                    if (!request.project) {
                        reply.code(404).send({ code: 'not_found', error: 'Not Found' })
                        return
                    }
                    await request.project.Team.ensureTeamTypeExists()
                    if (!request.project.Team.getFeatureProperty('teamHttpSecurity', false)) {
                        reply.code(404).send({ code: 'not_found', error: 'Not Found' })
                        return
                    }
                    if (request.session.User) {
                        request.teamMembership = await request.session.User.getTeamMembership(request.project.Team.id)
                        if (!request.teamMembership && !request.session.User.admin) {
                            reply.code(404).send({ code: 'not_found', error: 'Not Found' })
                            return
                        }
                    } else if (request.session.ownerId !== request.params.projectId) {
                        // AccessToken being used - but not owned by this project
                        reply.code(404).send({ code: 'not_found', error: 'Not Found' })
                        return
                    }
                } catch (err) {
                    reply.code(404).send({ code: 'not_found', error: 'Not Found' })
                }
            } else {
                reply.code(404).send({ code: 'not_found', error: 'Not Found' })
            }
        }
        if (request.params.deviceId !== undefined) {
            if (request.params.deviceId) {
                try {
                    request.device = await app.db.models.Device.byId(request.params.deviceId)
                    if (!request.device) {
                        reply.code(404).send({ code: 'not_found', error: 'Not Found' })
                        return
                    }
                    await request.device.Team.ensureTeamTypeExists()
                    if (!request.device.Team.getFeatureProperty('teamHttpSecurity', false)) {
                        reply.code(404).send({ code: 'not_found', error: 'Not Found' })
                        return
                    }
                    if (request.session.User) {
                        request.teamMembership = await request.session.User.getTeamMembership(request.device.Team.id)
                        if (!request.teamMembership && !request.session.User.admin) {
                            reply.code(404).send({ code: 'not_found', error: 'Not Found' })
                            return // eslint-disable-line no-useless-return
                        }
                    } else if (request.session.ownerId !== request.params.deviceId) {
                        // AccessToken being used - but not owned by this device
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

    // #region GET /httpTokens

    function getTokens (request, reply, tokens) {
        // exclude FF-Expert auto generated HTTP MCP tokens from listing
        const withoutExpertMcpTokens = tokens.filter(token => !isExpertMcpToken(token))
        const tokensView = app.db.views.AccessToken.instanceHTTPTokenSummaryList(withoutExpertMcpTokens)
        reply.send({
            tokens: tokensView,
            count: tokens.length
        })
    }
    app.get('/projects/:projectId/httpTokens', {
        preHandler: app.needsPermission('project:edit')
    }, async (request, reply) => {
        const tokens = await app.db.models.AccessToken.getProjectHTTPTokens(request.project)
        getTokens(request, reply, tokens)
    })
    app.get('/devices/:deviceId/httpTokens', {
        preHandler: app.needsPermission('device:edit')
    }, async (request, reply) => {
        const tokens = await app.db.models.AccessToken.getDeviceHTTPTokens(request.device)
        getTokens(request, reply, tokens)
    })

    // #region POST /httpTokens

    async function createToken (request, reply) {
        try {
            const body = request.body
            // Prevent creation of Expert MCP Access Tokens via this route
            if (isExpertMcpToken({ scope: body.scope })) {
                throw new Error('Cannot create Expert MCP Access Token via this route')
            }
            const token = await app.db.controllers.AccessToken.createHTTPNodeToken(request.project || request.device, body.name, [''], body.expiresAt)
            if (request.project) {
                await app.auditLog.Project.project.httpToken.created(request.session.User, null, request.project, body)
            } else if (request.device) {
                await app.auditLog.Device.device.httpToken.created(request.session.User, null, request.device, body)
            }
            reply.send(token || {})
        } catch (err) {
            const resp = { code: 'unexpected_error', error: err.toString() }
            reply.code(400).send(resp)
        }
    }
    app.post('/projects/:projectId/httpTokens', {
        preHandler: app.needsPermission('project:edit')
    }, async (request, reply) => {
        return createToken(request, reply)
    })
    app.post('/devices/:deviceId/httpTokens', {
        preHandler: app.needsPermission('device:edit')
    }, async (request, reply) => {
        return createToken(request, reply)
    })

    // #region PUT /httpTokens/:id

    async function updateToken (request, reply) {
        try {
            const owner = request.project || request.device
            // Ensure id is a string as the AccessToken.ownerId is stored as a string in the database
            const ownerId = '' + owner.id
            let ownerType = 'http'
            if (request.device) {
                ownerType = 'http:device'
            }
            const oldToken = await app.db.models.AccessToken.byId(request.params.id, ownerType, ownerId)
            if (oldToken) {
                // Prevent modification of Expert MCP Access Tokens via this route
                if (isExpertMcpToken(oldToken)) {
                    throw new Error('Cannot modify Expert MCP Access Token')
                }
                const body = request.body
                const token = await app.db.controllers.AccessToken.updateHTTPNodeToken(owner, request.params.id, [''], body.expiresAt)
                const updates = new app.auditLog.formatters.UpdatesCollection()
                updates.pushDifferences({ expiresAt: oldToken.expiresAt, scope: oldToken.scope.join(',') }, { expiresAt: body.expiresAt, scope: body.scope })
                if (request.project) {
                    await app.auditLog.Project.project.httpToken.updated(request.session.User, null, request.project, updates)
                } else if (request.device) {
                    await app.auditLog.Device.device.httpToken.updated(request.session.User, null, request.device, updates)
                }
                reply.send(app.db.views.AccessToken.instanceHTTPTokenSummary(token))
                return
            }
            reply.code(404).send({ code: 'not_found', error: 'Not Found' })
        } catch (err) {
            const resp = { code: 'unexpected_error', error: err.toString() }
            reply.code(400).send(resp)
        }
    }

    app.put('/projects/:projectId/httpTokens/:id', {
        preHandler: app.needsPermission('project:edit', true)
    }, async (request, reply) => {
        return updateToken(request, reply)
    })

    app.put('/devices/:deviceId/httpTokens/:id', {
        preHandler: app.needsPermission('device:edit', true)
    }, async (request, reply) => {
        return updateToken(request, reply)
    })

    // #region DELETE /httpTokens/:id

    async function deleteToken (request, reply) {
        try {
            const owner = request.project || request.device
            // Ensure id is a string as the AccessToken.ownerId is stored as a string in the database
            const ownerId = '' + owner.id
            let ownerType = 'http'
            if (request.device) {
                ownerType = 'http:device'
            }

            const oldToken = await app.db.models.AccessToken.byId(request.params.id, ownerType, ownerId)
            if (oldToken) {
                await oldToken.destroy()
                if (request.project) {
                    await app.auditLog.Project.project.httpToken.deleted(request.session.User, null, request.project, { name: oldToken.name })
                } else if (request.device) {
                    await app.auditLog.Device.device.httpToken.deleted(request.session.User, null, request.device, { name: oldToken.name })
                }
                reply.code(201).send()
                return
            }
            reply.code(404).send({ code: 'not_found', error: 'Not Found' })
        } catch (err) {
            const resp = { code: 'unexpected_error', error: err.toString() }
            reply.code(400).send(resp)
        }
    }

    app.delete('/projects/:projectId/httpTokens/:id', {
        preHandler: app.needsPermission('project:edit')
    }, async (request, reply) => {
        return deleteToken(request, reply)
    })
    app.delete('/devices/:deviceId/httpTokens/:id', {
        preHandler: app.needsPermission('device:edit')
    }, async (request, reply) => {
        return deleteToken(request, reply)
    })

    // #region Utility functions

    function isExpertMcpToken (token) {
        if (!token || !token.scope) {
            return false
        }

        return token.scope.some(s => EXPERT_MCP_SCOPES.includes(s))
    }
}
