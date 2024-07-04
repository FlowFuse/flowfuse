const { default: axios } = require('axios')

/**
 * Assistant api routes
 *
 * - /api/v1/assistant
 *
 * @namespace assistant
 * @memberof forge.routes.api
 */
module.exports = async function (app) {
    app.addHook('preHandler', app.verifySession)

    /**
     * Endpoint for assistant functions
     * For now, this is simply a relay to an external assistant service
     * In the future, we may decide to bring that service inside the core or
     * use an alternative means of accessing it.
    */
    app.post('/function', {
        preHandler: app.needsPermission('assistant:function'),
        schema: {
            hide: true, // dont show in swagger
            body: {
                type: 'object',
                properties: {
                    // The prompt to send to the assistant (required)
                    prompt: { type: 'string' },
                    // A correlation id for the transaction (required)
                    transactionId: { type: 'string' },
                    // Additional context for the function (optional)
                    context: { type: 'object', additionalProperties: true }
                },
                required: ['prompt', 'transactionId']
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
        // const method = request.params.method // FUTURE: allow for different methods
        const method = 'function' // for now, only function node/code generation is supported

        const serviceUrl = app.config.assistant?.service?.url
        const serviceToken = app.config.assistant?.service?.token
        const enabled = app.config.assistant?.enabled !== false && serviceUrl
        const requestTimeout = app.config.assistant?.service?.requestTimeout || 60000

        if (!enabled) {
            return reply.code(501).send({ code: 'service_disabled', error: 'Assistant service is not enabled' })
        }

        const url = `${serviceUrl.replace(/\/+$/, '')}/${method.replace(/^\/+/, '')}`

        // post to the assistant service
        const headers = {}
        if (serviceToken) {
            headers.Authorization = `Bearer ${serviceToken}`
        }
        const response = await axios.post(url, {
            ...request.body
        }, {
            headers,
            timeout: requestTimeout
        })

        reply.send(response.data)
    })
}
