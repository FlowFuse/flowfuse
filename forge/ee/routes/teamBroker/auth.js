const mqttMatch = require('mqtt-match')

module.exports = async function (app) {
    app.post('/auth', {
        schema: {
            body: {
                type: 'object',
                required: ['username', 'password'],
                properties: {
                    username: { type: 'string' },
                    password: { type: 'string' },
                    clientId: { type: 'string' }
                }
            },
            response: {
                200: {
                    type: 'object',
                    required: ['result'],
                    properties: {
                        result: { type: 'string' },
                        is_superuser: { type: 'boolean' },
                        client_attrs: { type: 'object', additionalProperties: true }
                    },
                    additionalProperties: true
                }
            }
        }
    }, async (request, reply) => {
        if ((request.body.username.startsWith('device:') && request.body.password.startsWith('ffbd_')) ||
            (request.body.username.startsWith('project:') && request.body.password.startsWith('ffbp_')) ||
            (request.body.username.startsWith('frontend:') && request.body.password.startsWith('ffbf_')) ||
            (request.body.username === 'forge_platform')) {
            const isValid = await app.db.controllers.BrokerClient.authenticateCredentials(
                request.body.username,
                request.body.password
            )
            if (isValid) {
                reply.send({
                    result: 'allow',
                    is_superuser: false,
                    client_attrs: {
                        team: 'team/internal/'
                    }
                })
            } else {
                reply.send({
                    result: 'deny'
                })
            }
        } else {
            const auth = await app.db.controllers.TeamBrokerUser.authenticateCredentials(request.body.username, request.body.password)
            if (auth) {
                const parts = request.body.username.split('@')
                // we might pass ACL values here
                // const user = await app.db.models.TeamBrokerUser.byUsername(parts[0], parts[1])
                reply.send({
                    result: 'allow',
                    is_superuser: false,
                    client_attrs: {
                        team: `teams/${parts[1]}/`
                    }
                })
            } else {
                reply.send({
                    result: 'deny'
                })
            }
        }
    })

    app.post('/acls', {
        schema: {
            body: {
                type: 'object',
                properties: {
                    username: { type: 'string' },
                    topic: { type: 'string' },
                    action: { type: 'string' }
                }
            },
            response: {
                200: {
                    type: 'object',
                    required: ['result'],
                    properties: {
                        result: { type: 'string' }
                    },
                    additionalProperties: true
                }
            }
        }
    }, async (request, reply) => {
        const username = request.body.username
        const topic = request.body.topic
        const action = request.body.action
        if ((username.startsWith('device:') ||
            username.startsWith('platform:') ||
            username.startsWith('frontend:') ||
            username === 'forge_platform') && !username.includes('@')) {
            const acc = action === 'subscribe' ? 1 : 2
            const allowed = await app.comms.aclManager.verify(username, topic, acc)
            if (allowed) {
                reply.send({ result: 'allow' })
            } else {
                reply.send({ result: 'deny' })
            }
            // return
        } else {
            const parts = request.body.username.split('@')
            const user = await app.db.models.TeamBrokerUser.byUsername(parts[0], parts[1])
            const acls = JSON.parse(user.acls)
            for (const acl in acls) {
                if (request.body.action === 'subscribe') {
                    if (mqttMatch(acls[acl].pattern, request.body.topic)) {
                        if (acls[acl].action === 'both' || acls[acl].action === 'subscribe') {
                            reply.send({ result: 'allow' })
                            return
                        }
                    }
                } else {
                    if (mqttMatch(acls[acl].pattern, request.body.topic)) {
                        if (acls[acl].action === 'both' || acls[acl].action === 'publish') {
                            reply.send({ result: 'allow' })
                            return
                        }
                    }
                }
            }
            reply.send({ result: 'deny' })
        }
    })
}
