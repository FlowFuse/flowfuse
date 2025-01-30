const YAML = require('yaml')
module.exports = async function (app) {
    app.get('/team-broker/schema.yml', async (request, reply) => {
        const list = await app.teamBroker.getUsedTopics(request.team.hashid)
        const schema = {
            asyncapi: '3.0.0',
            info: {
                version: '1.0.0',
                title: `${request.team.name} Team Broker`,
                description: 'An auto-generated schema of the topics being used on the team broker'
            }
        }
        // Add the team-broker details

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

        if (list.length > 0) {
            schema.channels = {}
            list.forEach(topic => {
                schema.channels[topic] = {
                    address: topic
                }
            })
        }
        reply.send(YAML.stringify(schema))
    })
}
