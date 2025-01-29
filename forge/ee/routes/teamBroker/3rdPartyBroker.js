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

            if (request.params.brokerId) {
                request.broker = await app.db.models.BrokerCredentials.byId(request.params.brokerId)
                if (!request.broker) {
                    reply.code(404).send({ code: 'not_found', error: 'Not Found' })
                    return // eslint-disable-line no-useless-return
                }
            }
        }
        if (!request.teamMembership && request.session.User) {
            request.teamMembership = await request.session.User.getTeamMembership(request.team.id)
        }
    })

    /**
     * Get All Credentials for 3rd Party Brokers linked to a team
     * @name /api/v1/teams:/teamId/brokers
     * @static
     * @memberof forge.routes.api.team.broker
     */
    app.get('', {
        preHandler: app.needsPermission('broker:credentials:list'),
        schema: {
            summary: 'Get credentials for 3rd party MQTT brokers',
            tags: ['MQTT Broker'],
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
        const credsList = await app.db.models.BrokerCredentials.byTeam(request.params.teamId, paginationOptions)
        reply.send(app.db.views.BrokerCredentials.cleanList(credsList))
    })

    /**
     * Add new Credentials for a 3rd Party Broker
     * @name /api/v1/teams/:teamId/brokers
     * @static
     * @memberof forge.routes.api.team.broker
     */
    app.post('', {
        preHandler: app.needsPermission('broker:credentials:create'),
        schema: {
            summary: 'Create credentials for a 3rd party MQTT broker',
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
                    name: { type: 'string' },
                    host: { type: 'string' },
                    port: { type: 'number' },
                    protocol: { type: 'string' },
                    protocolVersion: { type: 'number' },
                    ssl: { type: 'boolean' },
                    verifySSL: { type: 'boolean' },
                    clientId: { type: 'string' },
                    credentials: {
                        type: 'object'
                    }
                }
            },
            response: {
                201: {
                    type: 'object',
                    properties: {

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
        // Need to create a Access Token then pass it to the container driver
        // to spin up a mqtt-schema-agent
        const input = request.body
        input.state = 'stopped'
        input.credentials = JSON.stringify(request.body.credentials)
        input.TeamId = app.db.models.Team.decodeHashid(request.params.teamId)
        try {
            const creds = await app.db.models.BrokerCredentials.create(input)
            await creds.reload({ include: [{ model: app.db.models.Team }] })
            try {
                await app.containers.startBrokerAgent(creds)
            } catch (err) {
                // console.log(err)
            }
            const clean = app.db.views.BrokerCredentials.clean(creds)
            reply.status(201).send(clean)
        } catch (err) {
            if (err.name === 'SequelizeUniqueConstraintError') {
                reply.status(409).send({ error: 'broker_exists', message: 'Broker already exists for team' })
            } else {
                reply.status(500).send({ code: 'unexpected_error', error: err.toString() })
            }
        }
    })

    /**
     * Get Credentials for a 3rd Party Broker
     * @name /api/v1/teams/:teamId/brokers/:brokerId/credentials
     * @static
     * @memberof forge.routes.api.team.broker
     */
    app.get('/:brokerId/credentials', {
        preHandler: [
            async (request, reply) => {
                // TODO Needs custom preHandler to work with token for mqtt agent only
                if (request.session?.scope?.includes('broker:credentials')) {
                    if (request.session.ownerType === 'broker') {
                        if (request.params.teamId !== request.session.Broker.Team.hashid) {
                            reply.code('401').send({ code: 'unauthorized', error: 'unauthorized' })
                        }
                    } else {
                        reply.code('401').send({ code: 'unauthorized', error: 'unauthorized' })
                    }
                } else {
                    reply.code('401').send({ code: 'unauthorized', error: 'unauthorized' })
                }
            }
        ],
        schema: {
            summary: 'Gets credentials for a 3rd party MQTT broker',
            tags: ['MQTT Broker'],
            params: {
                type: 'object',
                properties: {
                    teamId: { type: 'string' },
                    brokerId: { type: 'string' }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {

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
        const creds = await app.db.models.BrokerCredentials.byId(request.params.brokerId)
        if (creds) {
            if (creds.Team.hashid === request.params.teamId) {
                const resp = creds.toJSON()
                resp.id = resp.hashid
                delete resp.hashid
                delete resp.slug
                delete resp.links
                delete resp.Team
                delete resp.TeamId
                delete resp.createdAt
                delete resp.updatedAt
                resp.credentials = JSON.parse(resp.credentials)
                reply.send(resp)
            } else {
                reply.code('401').send({ code: 'unauthorized', error: 'unauthorized' })
            }
        } else {
            reply.status(404).send({ code: 'not_found', error: 'not found' })
        }
    })

    /**
     * Edit 3rd Party Broker credentials
     * @name /api/v1/teams/:teamId/brokers/:brokerId
     * @static
     * @memberof forge.routes.api.team.broker
     */
    app.put('/:brokerId', {
        preHandler: app.needsPermission('broker:credentials:edit'),
        schema: {
            summary: 'Delete credentials for a 3rd party MQTT broker',
            tags: ['MQTT Broker'],
            params: {
                type: 'object',
                properties: {
                    teamId: { type: 'string' },
                    brokerId: { type: 'string' }
                }
            },
            body: {
                type: 'object',
                properties: {
                    name: { type: 'string' },
                    host: { type: 'string' },
                    port: { type: 'number' },
                    protocol: { type: 'string' },
                    protocolVersion: { type: 'number' },
                    ssl: { type: 'boolean' },
                    verifySSL: { type: 'boolean' },
                    clientId: { type: 'string' },
                    credentials: {
                        type: 'object'
                    }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {

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
        const brokerCreds = await app.db.models.BrokerCredentials.byId(request.params.brokerId)
        if (request.body.credentials) {
            request.body.credentials = JSON.stringify(request.body.credentials)
        }
        await brokerCreds.update(request.body)
        const clean = app.db.views.BrokerCredentials.clean(brokerCreds)
        reply.send(clean)
    })

    /**
     * Remove 3rd Party Broker credentials
     * @name /api/v1/teams/:teamId/brokers/:brokerId
     * @static
     * @memberof forge.routes.api.team.broker
     */
    app.delete('/:brokerId', {
        preHandler: app.needsPermission('broker:credentials:delete'),
        schema: {
            summary: 'Delete credentials for a 3rd party MQTT broker',
            tags: ['MQTT Broker'],
            params: {
                type: 'object',
                properties: {
                    teamId: { type: 'string' },
                    brokerId: { type: 'string' }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {

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
        const creds = await app.db.models.BrokerCredentials.byId(request.params.brokerId)
        if (creds) {
            try {
                // TODO Need to tear down the running mqtt-schema-agent
                // and remove the AccessToken
                await app.containers.stopBrokerAgent(creds)
                await creds.destroy()
                reply.send({})
            } catch (err) {
                reply.status(500).send({ error: 'unknown_erorr', message: err.toString() })
            }
        } else {
            reply.status(404).send({})
        }
    })

    /**
     * Get used Topics from a MQTT Broker
     * @name /api/v1/teams/:teamId/broker/:brokerId/topics
     * @static
     * @memberof forge.routes.api.team.broker
     */
    app.get('/:brokerId/topics', {
        preHandler: app.needsPermission('broker:topics:list'),
        schema: {
            summary: '',
            tags: ['MQTT Broker'],
            params: {
                type: 'object',
                properties: {
                    teamId: { type: 'string' },
                    brokerId: { type: 'string' }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {

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
        // should support pagination
        const topics = await app.db.models.MQTTTopicSchema.byBroker(request.params.brokerId)
        const clean = app.db.views.MQTTTopicSchema.cleanList(topics)
        reply.send(clean)
    })

    /**
     * Store Topics from a 3rd Party Broker
     * @name /api/v1/teams/:teamId/broker/:brokerId/topics
     * @static
     * @memberof forge.routes.api.team.broker
     */
    app.post('/:brokerId/topics', {
        // Might need a custom handler here to allow agent to upload
        preHandler: [
            async (request, reply) => {
                if (request.session?.scope?.includes('broker:topics')) {
                    if (request.session.ownerType === 'broker') {
                        if (request.params.teamId !== request.session.Broker.Team.hashid) {
                            reply.code('401').send({ code: 'unauthorized', error: 'unauthorized' })
                        }
                    } else {
                        reply.code('401').send({ code: 'unauthorized', error: 'unauthorized' })
                    }
                } else {
                    reply.code('401').send({ code: 'unauthorized', error: 'unauthorized' })
                }
            }
        ],
        schema: {
            summary: 'Store Topics from a 3rd party MQTT broker',
            tags: ['MQTT Broker'],
            params: {
                type: 'object',
                properties: {
                    teamId: { type: 'string' },
                    brokerId: { type: 'string' }
                }
            },
            body: {
                type: 'object',
                properties: {

                },
                additionalProperties: true
            },
            response: {
                201: {
                    type: 'object',
                    properties: {
                        topic: { type: 'string' }
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
        // console.log(request.body)
        const teamId = app.db.models.Team.decodeHashid(request.params.teamId)[0]
        let brokerId
        if (request.params.brokerId !== 'team') {
            brokerId = app.db.models.BrokerCredentials.decodeHashid(request.params.brokerId)[0]
        }
        const topicList = await app.db.models.MQTTTopicSchema.upsert({
            topic: request.body.topic,
            BrokerCredentialsId: brokerId,
            TeamId: teamId
        }, {
            topic: request.body.topic,
            BrokerCredentialsId: brokerId,
            TeamId: teamId
        })
        const topic = topicList[0]
        reply.status(201).send(app.db.views.MQTTTopicSchema.clean(topic))
    })

    /**
     * Modify Topic metadata from a 3rd Party Broker
     * @name /api/v1/teams/:teamId/broker/:brokerId/topics/:topicId
     * @static
     * @memberof forge.routes.api.team.broker
     */
    app.put('/:brokerId/topics/:topicId', {
        preHandler: app.needsPermission('broker:topics:write'),
        schema: {
            summary: '',
            tags: ['MQTT Broker'],
            params: {
                type: 'object',
                properties: {
                    teamId: { type: 'string' },
                    brokerId: { type: 'string' },
                    topicId: { type: 'string' }
                }
            },
            response: {
                201: {
                    type: 'object',
                    properties: {

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
        const topic = await app.db.models.MQTTTopicSchema.byId(request.params.topicId)
        if (topic) {
            if (topic.Team.hashid === request.params.teamId) {
                topic.metadata = JSON.stringify(request.body.metadata)
                await topic.save()
                // need view to clean up
                const response = topic.toJSON()
                if (response.metadata) {
                    response.metadata = JSON.parse(response.metadata)
                }
                response.id = response.hashid
                delete response.hashid
                reply.status(201).send(response)
            } else {
                reply.code('401').send({ code: 'unauthorized', error: 'unauthorized' })
            }
        } else {
            reply.status(404).send({ code: 'not_found', error: 'not found' })
        }
    })

    /**
     * Modify Topic metadata from a 3rd Party Broker
     * @name /api/v1/teams/:teamId/broker/:brokerId/topics/:topicId
     * @static
     * @memberof forge.routes.api.team.broker
     */
    app.delete('/:brokerId/topics/:topicId', {
        preHandler: app.needsPermission('broker:topics:write'),
        schema: {
            summary: '',
            tags: ['MQTT Broker'],
            params: {
                type: 'object',
                properties: {
                    teamId: { type: 'string' },
                    brokerId: { type: 'string' },
                    topicId: { type: 'string' }
                }
            },
            response: {
                201: {
                    type: 'object',
                    properties: {

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
        const topic = await app.db.models.MQTTTopicSchema.byId(request.params.topicId)
        if (topic) {
            if (topic.Team.hashid === request.params.teamId) {
                // need to check if topic belongs to broker requested
                if (request.params.brokerId !== 'team' && topic.BrokerCredentials.hashid === request.params.brokerId) {
                    await topic.destroy()
                    reply.status(201).send({})
                    return
                } else if (request.params.brokerId === 'team' && topic.BrokerCredentialsId === null) {
                    await topic.destroy()
                    reply.status(201).send({})
                    return
                }
                reply.code('401').send({ code: 'unauthorized', error: 'unauthorized' })
            } else {
                reply.code('401').send({ code: 'unauthorized', error: 'unauthorized' })
            }
        } else {
            reply.status(404).send({ code: 'not_found', error: 'not found' })
        }
    })
}
