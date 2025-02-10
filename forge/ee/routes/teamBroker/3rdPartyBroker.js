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

            if (request.params.brokerId && request.params.brokerId !== 'team-broker') {
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
                        meta: { $ref: 'PaginationMeta' },
                        count: { type: 'number' },
                        brokers: {
                            type: 'array',
                            items: {
                                $ref: 'MQTTBroker'
                            }
                        }
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
                $ref: 'MQTTBroker'
            },
            response: {
                201: {
                    $ref: 'MQTTBroker'
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
        input.state = 'running'
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
                    $ref: 'MQTTBroker'
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
        if (request.broker) {
            if (request.broker.Team.hashid === request.params.teamId) {
                const resp = request.broker.toJSON()
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
                    $ref: 'MQTTBroker'
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
        if (request.broker) {
            if (request.body.credentials) {
                request.body.credentials = JSON.stringify(request.body.credentials)
            }
            await request.broker.update(request.body)
            try {
                await app.containers.sendBrokerAgentCommand(request.broker, 'restart')
            } catch (err) {
            }
            const clean = app.db.views.BrokerCredentials.clean(request.broker)
            reply.send(clean)
        } else {
            reply.status(404).send({ code: 'not_found', error: 'not found' })
        }
    })

    /**
     * Get details and status of a 3rd Party Broker
     */
    app.get('/:brokerId', {
        preHandler: app.needsPermission('broker:credentials:list'),
        schema: {
            summary: 'Get 3rd Party Broker details and status',
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
                    $ref: 'MQTTBroker'
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
        if (request.params.brokerId !== 'team-broker') {
            try {
                const state = await app.containers.getBrokerAgentState(request.broker)
                const clean = app.db.views.BrokerCredentials.clean(request.broker)
                clean.state = state
                reply.send(clean)
            } catch (err) {
                reply.status(500).send({ error: 'unknown_error', message: err.toString() })
            }
        } else {
            reply.status(40).send({ error: 'not_supported', message: 'not supported' })
        }
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
        if (request.broker) {
            try {
                // TODO Need to tear down the running mqtt-schema-agent
                // and remove the AccessToken
                await app.containers.stopBrokerAgent(request.broker)
                await request.broker.destroy()
                reply.send({})
            } catch (err) {
                reply.status(500).send({ error: 'unknown_error', message: err.toString() })
            }
        } else {
            reply.status(404).send({ error: 'not_found', message: 'not found' })
        }
    })

    /**
     * Start collection from a Broker
     */
        app.post('/:brokerId/start', {
            preHandler: app.needsPermission('broker:credentials:edit'),
            schema: { }
        }, async (request, reply) => {
            let brokerId = request.params.brokerId
            if (brokerId === 'team-broker') {
                reply.status(403).send({})
            } else {
                await app.containers.sendBrokerAgentCommand(request.broker,'start')
                reply.status(200).send({})
            }
        })
    
        /**
         * Stop collection from a Broker
         */
        app.post('/:brokerId/stop', {
            preHandler: app.needsPermission('broker:credentials:edit'),
            schema: { }
        }, async (request, reply) => {
            let brokerId = request.params.brokerId
            if (brokerId === 'team-broker') {
                reply.status(403).send({})
            } else {
                await app.containers.sendBrokerAgentCommand(request.broker,'stop')
                reply.status(200).send({})
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
        let topics = []
        if (request.params.brokerId === 'team-broker') {
            topics = await app.db.models.MQTTTopicSchema.getTeamBroker(request.team.id)
        } else {
            topics = await app.db.models.MQTTTopicSchema.byBroker(request.params.brokerId)
        }
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
                    const hasPermission = app.needsPermission('broker:topics:write')
                    await hasPermission(request, reply) // hasPermission sends the error response if required which stops the request
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
        const teamId = app.db.models.Team.decodeHashid(request.params.teamId)[0]
        let brokerId
        if (request.params.brokerId !== 'team-broker') {
            brokerId = app.db.models.BrokerCredentials.decodeHashid(request.params.brokerId)[0]
        } else {
            // Get the placeholder creds object id used for team brokers
            brokerId = app.settings.get('team:broker:creds')
        }
        let body = request.body
        if (!Array.isArray(body)) {
            body = [body]
        }
        body.forEach(async topicInfo => {
            if (topicInfo.topic) {
                const topicObj = {
                    topic: topicInfo.topic,
                    BrokerCredentialsId: brokerId,
                    TeamId: teamId
                }
                if (Object.hasOwn(topicInfo, 'type')) {
                    topicObj.inferredSchema = JSON.stringify(topicInfo.type)
                }
                if (Object.hasOwn(topicInfo, 'metadata')) {
                    topicObj.metadata = topicInfo.metadata
                }
                try {
                    await app.db.models.MQTTTopicSchema.upsert(topicObj, {
                        fields: ['inferredSchema', 'metadata'],
                        conflictFields: ['topic', 'TeamId', 'BrokerCredentialsId']
                    })
                } catch (err) {
                    // reply.status(500).send({ error: 'unknown_erorr', message: err.toString() })
                    // return
                }
            }
        })
        reply.status(201).send({})
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
        let brokerId = request.params.brokerId
        if (brokerId === 'team-broker') {
            brokerId = app.settings.get('team:broker:creds')
        }
        const topic = await app.db.models.MQTTTopicSchema.get(request.params.teamId, brokerId, request.params.topicId)
        if (topic) {
            if (request.body.metadata) {
                topic.metadata = request.body.metadata
                await topic.save()
            }
            reply.status(201).send(app.db.views.MQTTTopicSchema.clean(topic))
        } else {
            reply.status(404).send({ code: 'not_found', error: 'not found' })
        }
    })

    /**
     * Delete a topic entry
     * @name /api/v1/teams/:teamId/broker/:brokerId/topics/*
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
        let brokerId = request.params.brokerId
        if (brokerId === 'team-broker') {
            brokerId = app.settings.get('team:broker:creds')
        }
        const topic = await app.db.models.MQTTTopicSchema.get(request.params.teamId, brokerId, request.params.topicId)
        if (topic) {
            await topic.destroy()
            reply.status(201).send({})
        } else {
            reply.status(404).send({ code: 'not_found', error: 'not found' })
        }
    })
}
