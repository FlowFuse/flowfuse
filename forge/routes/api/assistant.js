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
    app.addHook('preHandler', async (request, reply) => {
        // Only permit requests made by a valid device or instance token
        if (!request.session || request.session.provisioning) {
            reply.code(401).send({ code: 'unauthorized', error: 'unauthorized' })
        } else if (request.session.ownerType !== 'device' && request.session.ownerType !== 'project') {
            reply.code(401).send({ code: 'unauthorized', error: 'unauthorized' })
        } else {
            // get the owner object and team
            if (request.session.ownerType === 'device') {
                request.owner = await app.db.models.Device.byId(+request.session.ownerId)
                request.ownerType = 'device'
                request.ownerId = request.owner.hashid
            } else {
                request.owner = await app.db.models.Project.byId(request.session.ownerId)
                request.ownerType = 'project'
                request.ownerId = request.owner.id
            }
            request.team = await app.db.models.Team.byId(request.owner.Team.id)
        }
    })

    /**
     * Endpoint for assistant methods
     * For now, this is simply a relay to an external assistant service
     * In the future, we may decide to bring that service inside the core or
     * use an alternative means of accessing it.
    */
    app.post('/:method', {
        config: {
            rateLimit: app.config.rate_limits
                ? {
                    hook: 'preHandler', // apply the rate as a preHandler so that session is available
                    max: 5, // max requests per window
                    timeWindow: 30000, // 30 seconds
                    keyGenerator: (request) => {
                        return request.ownerId || request.ip
                    }
                }
                : false
        },
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
        const headers = {
            'ff-owner-type': request.ownerType,
            'ff-owner-id': request.ownerId
        }

        // include license information, team id and trial status so that we can make decisions in the assistant service
        const isLicensed = app.license?.active() || false
        const licenseType = isLicensed ? (app.license.get('dev') ? 'DEV' : 'EE') : 'CE'
        const tier = isLicensed ? app.license.get('tier') : null
        headers['ff-license-active'] = isLicensed
        headers['ff-license-type'] = licenseType
        headers['ff-license-tier'] = tier
        headers['ff-team-id'] = request.team.hashid
        if (app.billing && request.team.getSubscription) {
            const subscription = await request.team.getSubscription()
            headers['ff-team-trial'] = subscription ? subscription.isTrial() : null
        }
        if (serviceToken) {
            headers.Authorization = `Bearer ${serviceToken}`
        }
        try {
            const response = await axios.post(url, {
                ...request.body
            }, {
                headers,
                timeout: requestTimeout
            })
            reply.send(response.data)
        } catch (error) {
            reply.code(error.response?.status || 500).send({ code: error.response?.data?.code || 'unexpected_error', error: error.response?.data?.error || error.message })
        }
    })
}
