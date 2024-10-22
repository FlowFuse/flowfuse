module.exports = async function (app) {
    app.addHook('preHandler', app.verifySession)

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
    })

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
}
