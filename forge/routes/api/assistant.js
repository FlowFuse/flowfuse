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
    app.addHook('preHandler', (request, reply, done) => {
        // Only permit requests made by a valid device or instance token
        if (!request.session || request.session.provisioning) {
            reply.code(401).send({ code: 'unauthorized', error: 'unauthorized' })
        } else if (request.session.ownerType !== 'device' && request.session.ownerType !== 'project') {
            reply.code(401).send({ code: 'unauthorized', error: 'unauthorized' })
        } else {
            done()
        }
    })

    /**
     * Endpoint for assistant methods
     * For now, this is simply a relay to an external assistant service
     * In the future, we may decide to bring that service inside the core or
     * use an alternative means of accessing it.
    */
    app.post('/:method', {
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
        const method = request.params.method // the method to call at the assistant service
        if (/^[a-z0-9_-]+$/.test(method) === false) {
            return reply.code(400).send({ code: 'invalid_method', error: 'Invalid method name' })
        }

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
        if (request.session?.ownerType) {
            switch (request.session.ownerType) {
            case 'team':
                headers['ff-owner-type'] = 'team'
                headers['ff-owner-id'] = app.db.models.Team.encodeHashid(request.session.ownerId)
                break
            case 'device':
                headers['ff-owner-type'] = 'device'
                headers['ff-owner-id'] = app.db.models.Device.encodeHashid(request.session.ownerId)
                break
            case 'project':
            case 'instance':
                headers['ff-owner-type'] = request.session.ownerType
                headers['ff-owner-id'] = request.session.ownerId
            }
        }
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
