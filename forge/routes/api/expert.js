/**
 * Expert api routes
 *
 * - /api/v1/expert
 *
 * @namespace expert
 * @memberof forge.routes.api
 */
const { default: axios } = require('axios')
module.exports = async function (app) {
    // Get the assistant service configuration
    const expertUrl = app.config.expert?.service?.url
    const serviceEnabled = app.config.expert?.enabled === 'true'
    const requestTimeout = app.config.expert?.service?.requestTimeout || 60000

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
    })

    app.post('/fim/hydrate', {
        schema: {
            hide: true, // dont show in swagger
            body: {
                type: 'object',
                properties: {
                    history: {
                        type: 'array',
                        items: {
                            type: 'object',
                            additionalProperties: true
                        }
                    },
                    context: {
                        type: 'object',
                        additionalProperties: true
                    },
                    sessionId: { type: 'string' }
                },
                required: ['history', 'context', 'sessionId']
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
        const query = 'I\'ve just switched context from the FlowFuse Website to the Application'

        const response = await axios.post(expertUrl, {
            query,
            history: request.body.history,
            context: request.body.context
        }, {
            headers: {
                Origin: 'https://flowfuse.com',
                'X-Chat-Session-ID': request.body.sessionId,
                'X-Chat-Transaction-ID': 'transactionId' // todo sort this out
            },
            requestTimeout
        })

        reply.send(response.data)
    })

    app.post('/fim/message', {
        schema: {
            hide: true, // dont show in swagger
            body: {
                type: 'object',
                properties: {
                    message: { type: 'string' },
                    context: {
                        type: 'object',
                        additionalProperties: true
                    },
                    sessionId: { type: 'string' }
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
        const response = await axios.post(expertUrl, {
            query: request.body.message,
            context: request.body.context
        }, {
            headers: {
                Origin: 'https://flowfuse.com',
                'X-Chat-Session-ID': request.body.sessionId,
                'X-Chat-Transaction-ID': 'transactionId' // todo sort this out
            },
            requestTimeout
        })

        reply.send(response.data)
    })
}
