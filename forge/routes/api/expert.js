/**
 * Expert api routes
 *
 * - /api/v1/expert
 *
 * @namespace expert
 * @memberof forge.routes.api
 */
module.exports = async function (app) {
    // Get the assistant service configuration
    const expertUrl = app.config.expert?.service?.url
    const serviceEnabled = app.config.expert?.enabled !== false && expertUrl
    // const requestTimeout = app.config.expert?.service?.requestTimeout || 60000

    app.addHook('preHandler', app.verifySession)
    app.addHook('preHandler', async (request, reply) => {
        if (!serviceEnabled) {
            return reply.code(501).send({
                code: 'service_disabled',
                error: 'Expert service is not enabled'
            })
        }
        // Only permit requests made by a valid user client
        if (!request.session || request.session.provisioning) {
            reply.code(401).send({
                code: 'unauthorized',
                error: 'unauthorized'
            })
        } else if (request.session.ownerType === 'device' || request.session.ownerType === 'project') {
            reply.code(401).send({
                code: 'unauthorized',
                error: 'unauthorized'
            })
        } else {
            // Get the user object
            request.user = await app.db.models.User.byId(request.session.User.id)
            if (!request.user) {
                reply.code(401).send({
                    code: 'unauthorized',
                    error: 'unauthorized'
                })
            }
        }

        request.team = await app.db.models.Team.byId(request.owner.Team.id)
    })

    app.post('/fim/hydrate', {
        schema: {
            hide: true, // dont show in swagger
            body: {
                type: 'object',
                properties: {
                    history: { type: 'object', additionalProperties: true },
                    context: { type: 'object', additionalProperties: true },
                    sessionID: { type: 'string' }
                },
                required: ['history', 'context', 'sessionID']
            },
            response: {
                200: {
                    type: 'object',
                    additionalProperties: true
                },
                '4xx': {
                    $ref: 'APIError'
                }
            }
        }
    },
    async (request, reply) => {
        reply.send('hello light!')
    })

    app.post('/fim/message', {
        schema: {
            hide: true, // dont show in swagger
            body: {
                type: 'object',
                properties: {
                    message: { type: 'string' },
                    context: { type: 'object', additionalProperties: true },
                    sessionID: { type: 'string' }
                },
                required: ['history', 'context']
            },
            response: {
                200: {
                    type: 'object',
                    additionalProperties: true
                },
                '4xx': {
                    $ref: 'APIError'
                }
            }
        }
    },
    async (request, reply) => {
        reply.send('hello light!')
    })
}
