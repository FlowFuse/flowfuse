const { generatePassword } = require('../../../lib/userTeam')

const schemaApi = require('./schema')

module.exports = async function (app) {
    app.addHook('preHandler', async (request, reply) => {
        if (request.params.teamId !== undefined || request.params.teamSlug !== undefined) {
            // let teamId = request.params.teamId
            if (request.params.teamSlug) {
                // If :teamSlug is provided, need to lookup the team to get
                // its id for subsequent checks
                request.team = await app.db.models.Team.bySlug(request.params.teamSlug)
                if (!request.team) {
                    reply.code(404).send({ code: 'not_found', error: 'Not Found' })
                    return
                }
                // teamId = request.team.hashid
            }

            if (!request.team) {
                // For a :teamId route, we can now lookup the full team object
                request.team = await app.db.models.Team.byId(request.params.teamId)
                if (!request.team) {
                    reply.code(404).send({ code: 'not_found', error: 'Not Found' })
                    return
                }

                const teamType = await request.team.getTeamType()
                if (!teamType.getFeatureProperty('teamBroker', false)) {
                    reply.code(404).send({ code: 'not_found', error: 'Not Found' })
                    return // eslint-disable-line no-useless-return
                }
            }
        }
        if (request.session.User) {
            request.sessionUser = true
            request.instanceTokenReq = false
            if (!request.teamMembership) {
                request.teamMembership = await request.session.User.getTeamMembership(request.team.id)
            }
        } else if (request.session.ownerType === 'project' || request.session.ownerType === 'device') {
            // this is a request from a project or device
            request.sessionUserReq = false
            request.instanceTokenReq = true
        } else {
            reply.code(403).send({ code: 'unauthorized', error: 'Unauthorized' })
            throw new Error('Unauthorized')
        }
    })

    await schemaApi(app)

    /**
     * Get the Teams MQTT Clients
     * @name /api/v1/teams/:teamId/broker/clients
     * @static
     * @memberof forge.routes.api.team.broker
     */
    app.get('/clients', {
        preHandler: app.needsPermission('broker:clients:list'),
        schema: {
            summary: 'List MQTT clients for the team',
            tags: ['MQTT Broker'],
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
                        clients: { type: 'array' },
                        meta: { $ref: 'PaginationMeta' },
                        count: { type: 'integer' }
                    },
                    additionalProperties: true
                },
                '4xx': {
                    $ref: 'APIError'
                },
                500: {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        const paginationOptions = app.getPaginationOptions(request)
        const users = await app.db.models.TeamBrokerClient.byTeam(request.team.hashid, paginationOptions)
        reply.send(app.db.views.TeamBrokerClient.users(users))
    })

    /**
     * Creates a new MQTT Client
     * @name /api/v1/teams/:teamId/broker/client
     * @static
     * @memberof forge.routes.api.team.broker
     */
    app.post('/client', {
        preHandler: app.needsPermission('broker:clients:create'),
        schema: {
            summary: 'Create new MQTT client for the team',
            tags: ['MQTT Broker'],
            params: {
                type: 'object',
                properties: {
                    teamId: { type: 'string' }
                }
            },
            body: {
                type: 'object',
                properties: {
                    acls: { type: 'array' },
                    username: { type: 'string' },
                    password: { type: 'string' }
                }
            },
            response: {
                201: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        username: { type: 'string' },
                        acls: { type: 'array' }
                    }
                },
                '4xx': {
                    $ref: 'APIError'
                },
                500: {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        if (await app.db.models.TeamBrokerClient.byUsername(request.body.username, request.team.hashid)) {
            return reply
                .code(409)
                .send({
                    code: 'client_already_exists',
                    error: 'Client Already exists with username'
                })
        }
        try {
            const newUser = request.body
            newUser.acls = JSON.stringify(newUser.acls)
            await request.team.checkTeamBrokerClientCreateAllowed()
            const user = await app.db.models.TeamBrokerClient.create({ ...request.body, TeamId: request.team.id })
            reply.status(201).send(app.db.views.TeamBrokerClient.user(user))
        } catch (err) {
            return reply
                .code(err.statusCode || 400)
                .send({
                    code: err.code || 'unknown_error',
                    error: err.error || err.message
                })
        }
    })

    /**
     * Get a specific MQTT Client
     * @name /api/v1/teams/:teamId/broker/client/:username
     * @static
     * @memberof forge.routes.api.team.broker
     */
    app.get('/client/:username', {
        preHandler: app.needsPermission('broker:clients:list'),
        schema: {
            summary: 'Get details about a specific MQTT client',
            tags: ['MQTT Broker'],
            params: {
                type: 'object',
                properties: {
                    teamId: { type: 'string' },
                    username: { type: 'string' }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        username: { type: 'string' },
                        acls: { type: 'array' },
                        owner: { type: 'object' }
                    }
                },
                '4xx': {
                    $ref: 'APIError'
                },
                500: {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        const user = await app.db.models.TeamBrokerClient.byUsername(request.params.username, request.team.hashid)
        if (user) {
            reply.send(app.db.views.TeamBrokerClient.user(user))
        } else {
            reply.status(404).send({})
        }
    })

    /**
     * Update a specific MQTT Client
     * @name /api/v1/teams/:teamId/broker/client/:username
     * @static
     * @memberof forge.routes.api.team.broker
     */
    app.put('/client/:username', {
        preHandler: app.needsPermission('broker:clients:edit'),
        schema: {
            summary: 'Modify a MQTT Client',
            tags: ['MQTT Broker'],
            params: {
                type: 'object',
                properties: {
                    teamId: { type: 'string' },
                    username: { type: 'string' }
                }
            },
            body: {
                anyOf: [
                    {
                        type: 'object',
                        properties: {
                            password: { type: 'string' },
                            acls: { type: 'array' }
                        }
                    },
                    {
                        type: 'object',
                        properties: {
                            password: { type: 'string' }
                        }
                    },
                    {
                        type: 'object',
                        properties: {
                            acls: { type: 'array' }
                        }
                    }
                ]
            },
            response: {
                201: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        username: { type: 'string' },
                        acls: { type: 'array' }
                    }
                },
                '4xx': {
                    $ref: 'APIError'
                },
                500: {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        try {
            const user = await app.db.models.TeamBrokerClient.byUsername(request.params.username, request.team.hashid)
            if (!user) {
                return reply.status(404).send({})
            }
            if (request.body.password) {
                user.password = request.body.password
            }
            if (request.body.acls) {
                user.acls = JSON.stringify(request.body.acls)
            }
            await user.save()
            reply.status(201).send(app.db.views.TeamBrokerClient.user(user))
        } catch (err) {
            return reply
                .code(err.statusCode || 400)
                .send({
                    code: err.code || 'unknown_error',
                    error: err.error || err.message
                })
        }
    })

    /**
     * Delete a MQTT Clients
     * @name /api/v1/teams/:teamId/broker/client/:username
     * @static
     * @memberof forge.routes.api.team.broker
     */
    app.delete('/client/:username', {
        preHandler: app.needsPermission('broker:clients:delete'),
        schema: {
            summary: 'Delete a MQTT client',
            tags: ['MQTT Broker'],
            params: {
                type: 'object',
                properties: {
                    teamId: { type: 'string' },
                    username: { type: 'string' }
                }
            },
            response: {
                200: {
                    $ref: 'APIStatus'
                },
                '4xx': {
                    $ref: 'APIError'
                },
                500: {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        const user = await app.db.models.TeamBrokerClient.byUsername(request.params.username, request.team.hashid)
        if (user) {
            await user.destroy()
            reply.send({ status: 'okay' })
        } else {
            reply.status(404).send({})
        }
    })

    /**
     * Link a MQTT Client to a device or project
     * @name /api/v1/teams/:teamId/broker/client/:username/link
     * @static
     * @memberof forge.routes.api.team.broker
     */
    app.post('/client/:username/link', {
        preHandler: app.needsPermission('broker:clients:link'),
        schema: {
            summary: 'Link a MQTT client to a device or project',
            tags: ['MQTT Broker'],
            params: {
                type: 'object',
                properties: {
                    teamId: { type: 'string' },
                    username: { type: 'string' }
                }
            },
            body: {
                type: 'object',
                oneOf: [
                    // Case 1: Body is an empty object {}
                    {
                        // This matches an empty object.
                        additionalProperties: false // Ensures no other properties are allowed for this case
                    },
                    // Case 2: Body has both ownerType and ownerId
                    {
                        required: ['ownerType', 'ownerId'],
                        properties: {
                            ownerType: { type: 'string', enum: ['device', 'project', 'instance'] },
                            ownerId: { type: 'string' }
                        },
                        additionalProperties: false // Ensures only these two properties are allowed for this case
                    }
                ],
                // Define properties at the top level so their types are known by the validator
                // regardless of which oneOf matches (if a body is present).
                properties: {
                    ownerType: { type: 'string', enum: ['device', 'project', 'instance'] },
                    ownerId: { type: 'string' }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        username: { type: 'string' },
                        acls: { type: 'array' },
                        owner: {
                            type: 'object',
                            properties: {
                                instanceType: { type: 'string', enum: ['remote', 'local'] },
                                id: { type: 'string' },
                                name: { type: 'string' }
                            }
                        },
                        password: { type: 'string' }
                    }
                },
                '4xx': {
                    $ref: 'APIError'
                },
                500: {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        let user = await app.db.models.TeamBrokerClient.byUsername(request.params.username, request.team.hashid)

        let ownerId = request.body.ownerId
        let ownerType = request.body.ownerType
        if (request.instanceTokenReq) {
            ownerId = request.session.ownerId
            ownerType = request.session.ownerType
            if (ownerType === 'device') {
                ownerId = +ownerId // ID is a number for devices
            }
        }
        if (ownerType === 'instance') {
            ownerType = 'project' // instance is an alias for project
        }

        if (ownerType === 'device') {
            const device = await app.db.models.Device.byId(ownerId)
            if (!device) {
                return reply.status(404).send({})
            }
            ownerId = device.id
        } else if (ownerType === 'project') {
            const project = await app.db.models.Project.byId(ownerId)
            if (!project) {
                return reply.status(404).send({})
            }
        }

        // prepare a new password for the user (passwords are hashed in the DB using a non-reversible hash,
        // so the link operation always needs to generate a new password)
        const newPassword = generatePassword(16)
        let statusCode = 200

        if (!user) {
            // No user found - create a new one
            try {
                await request.team.checkTeamBrokerClientCreateAllowed()
            } catch (error) {
                if (error.code === 'broker_client_limit_reached') {
                    return reply
                        .code(403)
                        .send({
                            code: 'broker_client_limit_reached',
                            error: 'Team Broker client limit reached'
                        })
                }
            }
            // mvp for generating default acls
            const generateUuid = (length = 6) => {
                return Array.from(crypto.getRandomValues(new Uint8Array(6)), (byte) =>
                    byte.toString(36).padStart(2, '0')
                ).join('').substring(0, length)
            }
            const acls = [
                {
                    id: generateUuid(),
                    action: 'both',
                    pattern: '#'
                }
            ]
            const newUser = request.body
            newUser.acls = JSON.stringify(acls)
            newUser.username = request.params.username
            newUser.ownerType = ownerType
            newUser.ownerId = ownerId
            if (newUser.ownerType === 'device') {
                newUser.ownerId = +newUser.ownerId // ID is a number for devices
            }
            newUser.password = newPassword
            user = await app.db.models.TeamBrokerClient.create({ ...newUser, TeamId: request.team.id })
            statusCode = 201
        } else {
            // User found - check if it is already linked to a device or project
            if (user.ownerType && user.ownerId) {
                return reply.status(400).send({
                    code: 'client_already_linked',
                    error: 'Client is already linked to a device or project'
                })
            }
            // update the user with the new ownerType and ownerId
            user.ownerType = ownerType
            user.ownerId = ownerId
            user.password = newPassword
            await user.save()
        }
        // reload the user with the team and instance models
        const updatedUser = await app.db.models.TeamBrokerClient.byUsername(request.params.username, request.team.hashid, true, true)
        const userView = app.db.views.TeamBrokerClient.user(updatedUser)
        userView.password = newPassword
        reply.status(statusCode).send({ ...userView })
    })

    /**
     * Unlink a MQTT Client from a device or project
     * @name /api/v1/teams/:teamId/broker/client/:username/unlink
     * @static
     */
    app.delete('/client/:username/link', {
        preHandler: app.needsPermission('broker:clients:link'),
        schema: {
            summary: 'Unlink a MQTT client from a device or project',
            tags: ['MQTT Broker'],
            params: {
                type: 'object',
                properties: {
                    teamId: { type: 'string' },
                    username: { type: 'string' }
                }
            },
            response: {
                200: {
                    $ref: 'APIStatus'
                },
                '4xx': {
                    $ref: 'APIError'
                },
                500: {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        // get the user by username
        const user = await app.db.models.TeamBrokerClient.byUsername(request.params.username, request.team.hashid)
        if (!user) {
            return reply.status(404).send({})
        }

        // If the user is not linked to a device or project, return an error
        if (!user.ownerType || !user.ownerId) {
            return reply.status(400).send({
                code: 'client_not_linked',
                error: 'Client is not linked to a device or project'
            })
        }

        // If this is a request from a device or project, check that the ownerType and ownerId match the
        // values in the validated session object before unlinking. Session users are permitted to unlink
        // their own clients without this check.
        if (request.instanceTokenReq) {
            if (user.ownerType !== request.session.ownerType || user.ownerId !== request.session.ownerId) {
                return reply.status(400).send({
                    code: 'client_link_mismatch',
                    error: 'Client is linked to a different instance. Only the owner can unlink it.'
                })
            }
        }
        await user.destroy()
        reply.send({ status: 'okay' })
    })
}
