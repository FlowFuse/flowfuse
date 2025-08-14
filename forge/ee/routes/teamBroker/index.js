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
                    // Case 1: ownerType and ownerId are obtained from the token
                    {
                        required: ['password'],
                        properties: {
                            password: { type: 'string' }
                        },
                        additionalProperties: false // Ensures no other properties are allowed for this case
                    },
                    // Case 2: Body has ownerType and ownerId
                    {
                        required: ['ownerType', 'ownerId'],
                        properties: {
                            ownerType: { type: 'string', enum: ['device', 'instance'] },
                            ownerId: { type: 'string' },
                            password: { type: 'string' }
                        },
                        additionalProperties: false // Ensures only these properties are allowed for this case
                    }
                ],
                // Define properties at the top level so their types are known by the validator
                // regardless of which oneOf matches (if a body is present).
                properties: {
                    ownerType: { type: 'string', enum: ['device', 'instance'] },
                    ownerId: { type: 'string' },
                    password: { type: 'string' }
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
                                type: { type: 'string', enum: ['instance', 'device'] },
                                id: { type: 'string' },
                                name: { type: 'string' }
                            }
                        }
                    }
                },
                201: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        username: { type: 'string' },
                        acls: { type: 'array' },
                        owner: {
                            type: 'object',
                            properties: {
                                instanceType: { type: 'string', enum: ['instance', 'device'] },
                                id: { type: 'string' },
                                name: { type: 'string' }
                            }
                        }
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
        // validate request.params.username format matches instance||device:instanceIdStr
        if (!/^(instance|device):([a-zA-Z0-9_-]+)$/.test(request.params.username)) {
            return reply.status(400).send({
                code: 'invalid_username',
                error: 'Invalid username format. Expected format: instance|device:instanceIdStr'
            })
        }

        // ensure password is provided and is not too long
        if (!request.body.password || request.body.password.length > 128) {
            return reply.status(400).send({
                code: 'invalid_password',
                error: 'Invalid password'
            })
        }

        // Extract instance type and instance ID from the proposed username and later,
        // verify the match the session information.
        const usernameParts = request.params.username.split(':') // expects format: instance|device:instanceIdStr
        const usernameOwnerType = usernameParts[0] === 'instance' ? 'project' : usernameParts[0]
        const usernameOwnerId = usernameParts[1]

        let sessionOwnerId = request.body.ownerId
        let sessionOwnerType = request.body.ownerType === 'instance' ? 'project' : request.body.ownerType
        if (request.instanceTokenReq) {
            sessionOwnerId = request.session.ownerId
            sessionOwnerType = request.session.ownerType
            if (sessionOwnerType === 'device') {
                sessionOwnerId = +sessionOwnerId // ID is a number for devices
            }
        }

        if (sessionOwnerType !== usernameOwnerType) {
            return reply.status(404).send({ error: 'not_found', message: 'not found' })
        }

        if (sessionOwnerType === 'device') {
            const device = await app.db.models.Device.byId(sessionOwnerId)
            if (device.hashid !== usernameOwnerId) {
                return reply.status(404).send({ error: 'not_found', message: 'not found' })
            }
            if (device.Team.hashid !== request.params.teamId) {
                return reply.status(404).send({ error: 'not_found', message: 'not found' })
            }
            sessionOwnerId = device.id
        } else if (sessionOwnerType === 'project') {
            const instance = await app.db.models.Project.byId(sessionOwnerId)
            if (instance.id !== usernameOwnerId) {
                return reply.status(404).send({ error: 'not_found', message: 'not found' })
            }
            if (instance.Team.hashid !== request.params.teamId) {
                return reply.status(404).send({ error: 'not_found', message: 'not found' })
            }
        } else {
            // should never reach here
            return reply.status(404).send({ error: 'not_found', message: 'not found' })
        }

        let statusCode = 200
        let user = await app.db.models.TeamBrokerClient.byUsername(request.params.username, request.team.hashid)

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
                    action: 'subscribe', // by default allow subscribe only
                    pattern: '#'
                }
            ]
            const newUser = request.body
            newUser.acls = JSON.stringify(acls)
            newUser.username = request.params.username
            newUser.ownerType = sessionOwnerType
            newUser.ownerId = sessionOwnerId
            if (sessionOwnerType === 'device') {
                newUser.ownerId = +sessionOwnerId // ID is a number for devices
            }
            newUser.password = request.body.password
            user = await app.db.models.TeamBrokerClient.create({ ...newUser, TeamId: request.team.id })
            statusCode = 201
        } else {
            // User found - check: if type/id exists, it must match, otherwise return an error
            let checkOwnerId = user.ownerId || sessionOwnerId
            const checkOwnerType = user.ownerType || sessionOwnerType
            if (checkOwnerType === 'device') {
                checkOwnerId = +checkOwnerId
            }
            if (checkOwnerType !== sessionOwnerType || checkOwnerId !== sessionOwnerId) {
                return reply.status(400).send({
                    code: 'client_already_linked',
                    error: 'Client is linked to different instance'
                })
            }
            // update the user with the new ownerType and ownerId
            user.ownerType = sessionOwnerType
            user.ownerId = sessionOwnerId
            user.password = request.body.password
            await user.save()
        }
        // reload the user with the team and instance models
        const updatedUser = await app.db.models.TeamBrokerClient.byUsername(request.params.username, request.team.hashid, true, true)
        const userView = app.db.views.TeamBrokerClient.user(updatedUser)
        reply.status(statusCode).send({ ...userView })
    })
}
