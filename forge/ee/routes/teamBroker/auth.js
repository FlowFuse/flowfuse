const mqttMatch = require('mqtt-match')
module.exports = async function (app) {
    app.post('/auth',{
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
                        result: { type: 'string'},
                        is_superuser: { type: 'boolean' },
                        client_attrs: { type: 'object',  additionalProperties: true }
                    },
                    additionalProperties: true
                }
            }
        }
    }, async (request, reply) => {
        console.log(request.body)
        const auth = await app.db.controllers.TeamBrokerUser.authenticateCredentials(request.body.username, request.body.password)
        if (auth) {
            const parts = request.body.username.split('@')
            const user = await app.db.models.TeamBrokerUser.byUsername(parts[0],parts[1])
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
    })

    app.post('/acls', {

    }, async (request, reply) => {
        const parts = request.body.username.split('@')
        const user = await app.db.models.TeamBrokerUser.byUsername(parts[0],parts[1])
        const acls = JSON.parse(user.acls)
        for (const acl in acls) {
            if (request.body.action === 'subscribe') {
                if(mqttMatch(acls[acl].pattern, request.body.topic)) {
                    if (acls[acl].action === 'both' || acls[acl].action === 'subscribe') {
                        console.log('allow')
                        reply.send({ result: 'allow'})
                        return
                    }
                }
            } else {
                if(mqttMatch(acls[acl].pattern, request.body.topic)) {
                    if (acls[acl].action === 'both' || acls[acl].action === 'publish') {
                        reply.send({ result: 'allow'})
                        return
                    }
                }
            }
        }
        reply.send({ result: 'deny'})
    })
}