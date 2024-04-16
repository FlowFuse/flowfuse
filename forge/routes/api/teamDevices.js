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
    //             console.error(err)
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
        preHandler: app.needsPermission('team:device:list'),
        schema: {
            summary: 'Get a list of all devices in a team',
            tags: ['Team Devices'],
            query: { $ref: 'PaginationParams' },
            params: {
                type: 'object',
                properties: {
                    teamId: { type: 'string' },
                    statusOnly: { type: 'boolean' }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        meta: { $ref: 'PaginationMeta' },
                        count: { type: 'number' },
                        devices: { type: 'array', items: { $ref: 'Device' } }
                    }
                },
                '4xx': {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        const paginationOptions = app.db.controllers.Device.getDevicePaginationOptions(request)

        const where = {
            TeamId: request.team.id
        }

        const devices = await app.db.models.Device.getAll(paginationOptions, where, { includeInstanceApplication: true })
        devices.devices = devices.devices.map(d => app.db.views.Device.device(d, { statusOnly: paginationOptions.statusOnly }))

        reply.send(devices)
    })

    /**
     * Get a list of device provisioning tokens belonging to this team
     * @name /api/v1/team/:teamId/devices/provisioning
     * @static
     * @memberof forge.routes.api.team
     */
    app.get('/provisioning', {
        preHandler: app.needsPermission('team:device:provisioning-token:list'),
        schema: {
            summary: 'Get a list of device provisioning tokens in a team',
            tags: ['Team Devices'],
            query: { $ref: 'PaginationParams' },
            params: {
                type: 'object',
                properties: {
                    teamId: { type: 'string' }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        meta: { $ref: 'PaginationMeta' },
                        count: { type: 'number' },
                        tokens: { type: 'array', items: { $ref: 'ProvisioningTokenSummary' } }
                    }
                },
                '4xx': {
                    $ref: 'APIError'
                }
            }
        }
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
            summary: 'Create a new provisioning token in a team',
            tags: ['Team Devices'],
            params: {
                type: 'object',
                properties: {
                    teamId: { type: 'string' }
                }
            },
            body: {
                type: 'object',
                required: ['name'],
                properties: {
                    name: { type: 'string' },
                    instance: { type: 'string' },
                    expiresAt: {
                        oneOf: [
                            { type: 'string' },
                            { type: 'object' }
                        ]
                    }
                }
            },
            response: {
                200: {
                    $ref: 'ProvisioningToken'
                },
                '4xx': {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        /** @type {import('../../db/controllers/AccessToken.js')} */
        const AccessTokenController = app.db.controllers.AccessToken
        const team = request.team
        const instanceId = request.body.instance
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
            if (instanceId) {
                const instanceDetails = await app.db.models.Project.findOne({
                    where: { id: instanceId },
                    attributes: ['TeamId']
                })
                if (!instanceDetails || instanceDetails.TeamId !== team.id) {
                    const err = new Error('Invalid instance')
                    err.code = 'invalid_instance'
                    throw err
                }
            }
            const token = await AccessTokenController.createTokenForTeamDeviceProvisioning(tokenName, team, instanceId, expiresAt)
            await app.auditLog.Team.team.device.provisioning.created(request.session.User, null, token.id, tokenName, team, instanceId)
            reply.send(token)
        } catch (err) {
            let responseMessage
            if (err.errors) {
                responseMessage = err.errors.map(err => err.message).join(',')
            } else {
                responseMessage = err.toString()
            }
            const resp = { code: err.code || 'unexpected_error', error: responseMessage }
            await app.auditLog.Team.team.device.provisioning.created(request.session.User, resp, '', tokenName, team, instanceId)
            reply.code(400).send(resp)
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
            summary: 'Update a provisioning token in a team',
            tags: ['Team Devices'],
            params: {
                type: 'object',
                properties: {
                    teamId: { type: 'string' },
                    tokenId: { type: 'string' }
                }
            },
            body: {
                type: 'object',
                properties: {
                    instance: { type: 'string' },
                    expiresAt: { nullable: true, type: 'string' }
                }
            },
            response: {
                200: {
                    $ref: 'ProvisioningTokenSummary'
                },
                '4xx': {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        /** @type {import('../../db/controllers/AccessToken.js')} */
        const AccessTokenController = app.db.controllers.AccessToken
        const team = request.team
        const instanceId = request.body.instance
        const expiresAt = request.body.expiresAt ? new Date(request.body.expiresAt) : null
        let tokenName = 'unknown'
        const tokenId = request.params.tokenId
        try {
            const accessToken = await app.db.models.AccessToken.byId(tokenId, 'team', team.id)
            if (accessToken) {
                if (instanceId) {
                    const instanceDetails = await app.db.models.Project.findOne({
                        where: { id: instanceId },
                        attributes: ['TeamId']
                    })
                    if (!instanceDetails || instanceDetails.TeamId !== team.id) {
                        const err = new Error('Invalid instance')
                        err.code = 'invalid_instance'
                        throw err
                    }
                }
                const tokenDetails = await app.db.views.AccessToken.provisioningTokenSummary(accessToken)
                let updatedTokenDetails
                tokenName = tokenDetails.name || '[unnamed]'
                /** @type {import('../../auditLog/formatters').UpdatesCollection} */
                const updates = new app.auditLog.formatters.UpdatesCollection()
                updates.pushDifferences(
                    { instance: tokenDetails.instance || '', expiresAt: tokenDetails.expiresAt || '' },
                    { instance: instanceId || '', expiresAt: expiresAt || '' }
                )
                if (updates.length) {
                    await AccessTokenController.updateTokenForTeamDeviceProvisioning(accessToken, instanceId, expiresAt)
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
            const resp = { code: err.code || 'unexpected_error', error: responseMessage }
            await app.auditLog.Team.team.device.provisioning.created(request.session.User, resp, tokenId, tokenName, team, instanceId)
            reply.code(400).send(resp)
        }
    })

    /**
         * Delete a processing token belonging to this team
         * @name /api/v1/teams/:teamId/devices/provisioning/:tokenId
         * @static
         * @memberof forge.routes.api.team
         */
    app.delete('/provisioning/:tokenId', {
        preHandler: app.needsPermission('team:device:provisioning-token:delete'),
        schema: {
            summary: 'Delete a provisioning token',
            tags: ['Team Devices'],
            params: {
                type: 'object',
                properties: {
                    teamId: { type: 'string' },
                    tokenId: { type: 'string' }
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
        let tokenName = 'unknown'
        const tokenId = request.params.tokenId
        const team = request.team
        try {
            const accessToken = await app.db.models.AccessToken.byId(tokenId, 'team', team.id)
            if (accessToken) {
                const tokenDetails = await app.db.views.AccessToken.provisioningTokenSummary(accessToken)
                tokenName = tokenDetails.name || '[unnamed]'
                await accessToken.destroy()
                await app.auditLog.Team.team.device.provisioning.deleted(request.session.User, null, tokenId, tokenName, request.team)
                reply.send({ status: 'okay' })
                return
            }
            reply.code(404).send({ code: 'not_found', error: 'Token not found' })
        } catch (err) {
            const resp = { code: 'unexpected_error', error: err.toString() }
            await app.auditLog.Team.team.device.provisioning.deleted(request.session.User, resp, tokenId, tokenName, request.team)
            reply.code(400).send(resp)
        }
    })
}
