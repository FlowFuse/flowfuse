const YAML = require('yaml')
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

    app.get('/:brokerId/schema.yml', {
        preHandler: app.needsPermission('broker:topics:list')
    }, async (request, reply) => {
        const schema = {
            asyncapi: '3.0.0',
            info: {
                version: '1.0.0',
                title: `${request.team.name} Team Broker`,
                description: 'An auto-generated schema of the topics being used on the team broker'
            }
        }

        let topics
        const isTeamBroker = request.params.brokerId === 'team-broker'
        if (isTeamBroker) {
            schema.info.title = `${request.team.name} Team Broker`
            schema.info.description = 'An auto-generated schema of the topics being used on the team broker'
            topics = await app.db.models.MQTTTopicSchema.getTeamBroker(request.team.hashid)
            // Figure out the hostname for the team broker
            let teamBrokerHost = app.config.broker?.teamBroker?.host
            if (!teamBrokerHost) {
                // No explict value set, default to broker.${domain}
                if (app.config.domain) {
                    teamBrokerHost = `broker.${app.config.domain}`
                }
            }
            if (teamBrokerHost) {
                schema.servers = {
                    'team-broker': {
                        host: teamBrokerHost,
                        protocol: 'mqtt',
                        security: [{
                            type: 'userPassword'
                        }]
                    }
                }
            }
        } else {
            schema.info.title = `${request.broker.name}`
            schema.info.description = `An auto-generated schema of the topics being used on the '${request.broker.name}' broker`
            topics = await app.db.models.MQTTTopicSchema.byBroker(request.broker.id)

            schema.servers = {
                [request.broker.name]: {
                    host: request.broker.host + ':' + request.broker.port,
                    protocol: 'mqtt'
                }
            }
            if (request.broker.credentials) {
                const creds = JSON.parse(request.broker.credentials)
                if (creds.username && creds.password) {
                    schema.servers[request.broker.name].security = [{
                        type: 'userPassword'
                    }]
                }
            }
        }

        const topicList = topics.topics
        topicList.sort((A, B) => A.topic.localeCompare(B.topic))
        if (topicList.length > 0) {
            schema.channels = {}
            topicList.forEach(topicObj => {
                schema.channels[topicObj.topic] = {
                    address: topicObj.topic
                }
                if (topicObj.metadata?.description) {
                    schema.channels[topicObj.topic].description = topicObj.metadata?.description
                }
            })
        }
        reply.send(YAML.stringify(schema))
    })
}
