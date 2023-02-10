// const { Roles } = require('../../lib/roles.js')

/**
 * Team Devices api routes
 *
 * - /api/v1/teams/:teamId/devices
 *
 * By the time these handlers are invoked, :teamApi will have been validated
 * and 404'd if it doesn't exist. `request.team` will contain the team object
 *
 * @namespace teamDevices
 * @memberof forge.routes.api
 */
module.exports = async function (app) {
    // app.addHook('preHandler', async (request, reply) => {
    //     if (request.params.userId) {
    //         try {
    //             if (request.session.User.id === request.params.userId) {
    //                 // Don't need to lookup the user/role again
    //                 request.user = request.session.User
    //                 request.userRole = request.teamMembership
    //             } else {
    //                 request.user = await app.db.models.User.byId(request.params.userId)
    //                 if (!request.user) {
    //                     reply.code(404).send({ code: 'not_found', error: 'Not Found' })
    //                     return
    //                 }
    //                 request.userRole = await request.user.getTeamMembership(request.params.teamId)
    //             }
    //         } catch (err) {
    //             console.log(err)
    //             reply.code(404).send({ code: 'not_found', error: 'Not Found' })
    //         }
    //     }
    // })

    /**
     * Get a list of devices owned by this team
     * @name /api/v1/team/:teamId/devices
     * @static
     * @memberof forge.routes.api.team
     */
    app.get('/', {
        preHandler: app.needsPermission('team:device:list')
    }, async (request, reply) => {
        const paginationOptions = app.getPaginationOptions(request)
        const where = {
            TeamId: request.team.id
        }
        const devices = await app.db.models.Device.getAll(paginationOptions, where)
        devices.devices = devices.devices.map(d => app.db.views.Device.deviceSummary(d))
        reply.send(devices)
    })

    /**
     * Get a list of device provisioning tokens belonging to this team
     * @name /api/v1/team/:teamId/devices/provisioning
     * @static
     * @memberof forge.routes.api.team
     */
    app.get('/provisioning', {
        preHandler: app.needsPermission('team:device:provisioning-token:list')
    }, async (request, reply) => {
        const paginationOptions = app.getPaginationOptions(request)
        const result = await app.db.models.AccessToken.getProvisioningTokens(paginationOptions, request.team)
        result.tokens = await Promise.all(result.tokens?.map(async t => {
            return await app.db.views.AccessToken.provisioningTokenSummary(t)
        }))
        reply.send(result)
    })

    /**
     * Create a new device provisioning token belonging to this team
     * @name /api/v1/team/:teamId/devices/provisioning
     * @static
     * @memberof forge.routes.api.team
     */
    app.post('/provisioning', {
        preHandler: app.needsPermission('team:device:provisioning-token:create'),
        schema: {
            body: {
                type: 'object',
                required: ['name'],
                properties: {
                    name: { type: 'string' },
                    project: { type: 'string' },
                    expiresAt: {
                        oneOf: [
                            { type: 'string' },
                            { type: 'object' }
                        ]
                    }
                }
            }
        }
    }, async (request, reply) => {
        /** @type {import('../../db/controllers/AccessToken.js')} */
        const AccessTokenController = app.db.controllers.AccessToken
        const team = request.team
        const project = request.body.project
        const tokenName = request.body.name?.trim()
        const expiresAt = request.body.expiresAt ? new Date(request.body.expiresAt) : null
        try {
            // ensure name is made up of only alphanumeric characters, spaces, dashed and underscores
            if (/^[a-z0-9-_ ]+$/i.test(tokenName) !== true) {
                throw new Error('Token name must only contain alphanumeric characters, spaces, dashed and underscores')
            }
            if (tokenName.length < 1 || tokenName.length > 80) {
                throw new Error('Token name must be between 1 and 80 characters long')
            }
            const token = await AccessTokenController.createTokenForTeamDeviceProvisioning(tokenName, team, project, expiresAt)
            await app.auditLog.Team.team.device.provisioning.created(request.session.User, null, token.id, tokenName, team, project)
            reply.send(token)
        } catch (err) {
            let responseMessage
            if (err.errors) {
                responseMessage = err.errors.map(err => err.message).join(',')
            } else {
                responseMessage = err.toString()
            }
            const resp = { code: 'unexpected_error', error: responseMessage }
            await app.auditLog.Team.team.device.provisioning.created(request.session.User, resp, '', tokenName, team, project)
            reply.code(400).send({ code: 'unexpected_error', error: responseMessage })
        }
    })

    /**
     * Update a device provisioning token belonging to this team
     * @name /api/v1/team/:teamId/devices/provisioning/:tokenId
     * @static
     * @memberof forge.routes.api.team
     */
    app.put('/provisioning/:tokenId', {
        preHandler: app.needsPermission('team:device:provisioning-token:edit'),
        schema: {
            body: {
                type: 'object',
                properties: {
                    project: { type: 'string' },
                    expiresAt: {
                        oneOf: [
                            { type: 'string' },
                            { type: 'object' }
                        ]
                    }
                }
            }
        }
    }, async (request, reply) => {
        /** @type {import('../../db/controllers/AccessToken.js')} */
        const AccessTokenController = app.db.controllers.AccessToken
        const team = request.team
        const project = request.body.project
        const expiresAt = request.body.expiresAt ? new Date(request.body.expiresAt) : null
        let tokenName = 'unknown'
        const tokenId = request.params.tokenId
        try {
            const accessToken = await app.db.models.AccessToken.byId(tokenId)
            if (accessToken) {
                const tokenDetails = await app.db.views.AccessToken.provisioningTokenSummary(accessToken)
                let updatedTokenDetails
                tokenName = tokenDetails.name || '[unnamed]'
                /** @type {import('../../auditLog/formatters').UpdatesCollection} */
                const updates = new app.auditLog.formatters.UpdatesCollection()
                updates.pushDifferences(
                    { project: tokenDetails.project || '', expiresAt: tokenDetails.expiresAt || '' },
                    { project: project || '', expiresAt: expiresAt || '' }
                )
                if (updates.length) {
                    await AccessTokenController.updateTokenForTeamDeviceProvisioning(accessToken, project, expiresAt)
                    updatedTokenDetails = await app.db.views.AccessToken.provisioningTokenSummary(await app.db.models.AccessToken.byId(tokenId))
                    await app.auditLog.Team.team.device.provisioning.updated(request.session.User, null, tokenId, tokenName, team, updates)
                }
                reply.send(updatedTokenDetails || tokenDetails)
                return
            }
            reply.code(404).send({ code: 'not_found', error: 'Token not found' })
        } catch (err) {
            let responseMessage
            if (err.errors) {
                responseMessage = err.errors.map(err => err.message).join(',')
            } else {
                responseMessage = err.toString()
            }
            const resp = { code: 'unexpected_error', error: responseMessage }
            await app.auditLog.Team.team.device.provisioning.created(request.session.User, resp, tokenId, tokenName, team, project)
            reply.code(400).send({ code: 'unexpected_error', error: responseMessage })
        }
    })

    /**
         * Delete a processing token belonging to this team
         * @name /api/v1/teams/:teamId/devices/provisioning/:tokenId
         * @static
         * @memberof forge.routes.api.team
         */
    app.delete('/provisioning/:tokenId', {
        preHandler: app.needsPermission('team:device:provisioning-token:delete')
    }, async (request, reply) => {
        let tokenName = 'unknown'
        const tokenId = request.params.tokenId
        try {
            const accessToken = await app.db.models.AccessToken.byId(tokenId)
            if (accessToken) {
                const tokenDetails = await app.db.views.AccessToken.provisioningTokenSummary(accessToken)
                tokenName = tokenDetails.name || '[unnamed]'
                await accessToken.destroy()
                await app.auditLog.Team.team.device.provisioning.deleted(request.session.User, null, tokenId, tokenName, request.team)
            }
            reply.send({})
        } catch (err) {
            const resp = { code: 'unexpected_error', error: err.toString() }
            await app.auditLog.Team.team.device.provisioning.deleted(request.session.User, resp, tokenId, tokenName, request.team)
            reply.code(400).send(resp)
        }
    })
}
