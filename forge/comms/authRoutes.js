/**
 * Broker authentication backend
 *
 * - /api/comms/auth/client - verify username/password
 * - /api/comms/auth/acl - verify username is permitted to pub/sub to particular topic
 *
 */

module.exports = async function (app) {
    app.post('/client', {
        config: {
            rateLimit: false // never rate limit this route
        },
        schema: {
            body: {
                type: 'object',
                required: ['clientid', 'password', 'username'],
                properties: {
                    clientid: { type: 'string' },
                    password: { type: 'string' },
                    username: { type: 'string' }
                }
            }
        }
    }, async (request, response) => {
        if (app.license.active() && app.license.status().expired) {
            response.status(401).send()
            return
        }
        const isValid = await app.db.controllers.BrokerClient.authenticateCredentials(
            request.body.username,
            request.body.password
        )
        if (isValid) {
            response.status(200).send()
        } else {
            response.status(401).send()
        }
    })

    app.post('/acl', {
        config: {
            rateLimit: false // never rate limit this route
        },
        schema: {
            body: {
                type: 'object',
                required: ['acc', 'clientid', 'topic', 'username'],
                properties: {
                    clientid: { type: 'string' },
                    username: { type: 'string' },
                    topic: { type: 'string' },
                    acc: { type: 'number' }
                }
            }
        }
    }, async (request, response) => {
        if (app.license.active() && app.license.status().expired) {
            response.status(401).send()
            return
        }
        const allowed = await app.comms.aclManager.verify(request.body.username, request.body.topic, request.body.acc)
        // ↓ Useful for debugging ↓
        // console.warn(`${allowed ? 'ALLOWED' : 'FORBIDDEN'}! ACL check: '${request.body.topic}' for user ${request.body.username} (${request.body.acc === 2 ? 'PUB' : 'SUB'})`)
        if (allowed) {
            response.status(200).send()
        } else {
            response.status(401).send()
        }
    })

    // app.get('/test', async (request, response) => {
    //     const project = await app.db.models.Project.byId('ac8e4995-cb47-42ec-a9a4-71c42366c7f3')
    //     const creds = await app.db.controllers.BrokerClient.createClientForProject(project)
    //     // const device = await app.db.models.Device.byId(1)
    //     // const creds = await app.db.controllers.BrokerClient.createClientForDevice(device)
    //     response.send(creds)
    // })
}
