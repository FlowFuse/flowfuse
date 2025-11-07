/**
 * Expert api routes
 *
 * - /api/v1/expert
 *
 * @namespace expert
 * @memberof forge.routes.api
 */
const { default: axios } = require('axios')
const { v4: uuidv4 } = require('uuid')

const { sanitizeExpertInput } = require('../../lib/inputSanitizer')

module.exports = async function (app) {
    // Get the assistant service configuration
    const serviceEnabled = app.config.expert?.enabled === true
    const expertUrl = app.config.expert?.service?.url
    const serviceToken = app.config.expert?.service?.token
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

    app.post('/chat', {
        config: {
            rateLimit: {
                max: 20, // 20 requests
                timeWindow: '10 minutes' // per 10 minutes
            }
        },
        schema: {
            hide: true, // dont show in swagger
            body: {
                type: 'object',
                properties: {
                    history: {
                        type: 'array',
                        maxItems: 50,
                        items: {
                            type: 'object',
                            properties: {
                                query: {
                                    type: 'string',
                                    maxLength: 10000
                                },
                                answer: {
                                    type: 'array',
                                    items: {
                                        type: 'object',
                                        properties: {
                                            kind: { type: 'string' },
                                            content: { type: 'string' },
                                            title: { type: 'string' }
                                        },
                                        required: ['kind']
                                    }
                                }
                            },
                            required: ['query'],
                            additionalProperties: false
                        }
                    },
                    context: {
                        type: 'object',
                        properties: {
                            userId: { type: ['string', 'null'] },
                            teamId: { type: ['string', 'null'] },
                            teamSlug: { type: ['string', 'null'] },
                            instanceId: { type: ['string', 'null'] },
                            deviceId: { type: ['string', 'null'] },
                            applicationId: { type: ['string', 'null'] },
                            isTrialAccount: { type: 'boolean' },
                            pageName: { type: 'string' },
                            scope: { type: 'string' },
                            rawRoute: { type: 'object' }
                        },
                        additionalProperties: false
                    },
                    query: {
                        type: 'string',
                        maxLength: 5000
                    }
                },
                required: ['context']
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
        const sessionId = request.headers['x-chat-session-id'] ?? uuidv4()
        const transactionId = request.headers['x-chat-transaction-id']

        // Sanitize input to prevent prompt injection
        const sanitizationResult = sanitizeExpertInput({
            query: request.body.query,
            history: request.body.history,
            context: request.body.context
        })

        const { sanitized, suspicious } = sanitizationResult

        // Log suspicious activity for security monitoring
        if (suspicious.hasSuspiciousContent) {
            app.log.warn({
                msg: 'Suspicious prompt injection attempt detected',
                userId: request.user.id,
                username: request.user.username,
                sessionId,
                suspiciousPatterns: {
                    inQuery: suspicious.foundInQuery.length,
                    inHistory: suspicious.foundInHistory.length
                }
            })

            // Audit log the event
            await app.auditLog.Platform.expert.promptInjectionAttempt(request.user, null, {
                patterns: suspicious,
                sessionId
            })
        }

        let query = sanitized.query
        if (sanitized.history && sanitized.history.length > 0) {
            query = ''
        }

        try {
            const response = await axios.post(expertUrl, {
                query,
                history: sanitized.history,
                context: sanitized.context
            }, {
                headers: {
                    Origin: request.headers.origin,
                    'X-Chat-Session-ID': sessionId,
                    'X-Chat-Transaction-ID': transactionId,
                    ...(serviceToken ? { Authorization: `Bearer ${serviceToken}` } : {})
                },
                timeout: requestTimeout
            })

            if (response.data.transactionId !== transactionId) {
                throw new Error('Transaction ID mismatch')
            }

            reply.send(response.data)
        } catch (error) {
            reply.code(error.response?.status || 500).send({ code: error.response?.data?.code || 'unexpected_error', error: error.response?.data?.error || error.message })
        }
    })
}
