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
module.exports = async function (app) {
    // Get the assistant service configuration
    const serviceEnabled = app.config.expert?.enabled === true
    const expertUrl = app.config.expert?.service?.url
    const serviceToken = app.config.expert?.service?.token
    const requestTimeout = app.config.expert?.service?.requestTimeout || 60000

    app.addHook('preHandler', app.verifySession)
    app.addHook('preHandler', async (request, reply) => {
        if (!serviceEnabled || !expertUrl) {
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
                return reply.code(401).send({
                    code: 'unauthorized',
                    error: 'unauthorized'
                })
            }
            // Ensure users team access is valid
            const teamId = request.body.context?.teamId || request.body.context?.team
            if (!teamId) {
                return reply.status(404).send({ code: 'not_found', error: 'Not Found' })
            }
            const existingRole = await request.user.getTeamMembership(teamId)
            if (!existingRole) {
                return reply.status(404).send({ code: 'not_found', error: 'Not Found' })
            }
            request.team = await app.db.models.Team.byId(teamId)
            if (!request.team) {
                return reply.status(404).send({ code: 'not_found', error: 'Not Found' })
            }
        }
    })

    app.post('/chat', {
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
                    query: { type: 'string' }
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
        let query = request.body.query
        if (request.body.history) {
            query = ''
        }
        try {
            const response = await axios.post(expertUrl, {
                query,
                history: request.body.history,
                context: request.body.context
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
    /**
     * an endpoint to retrieve MCP features (prompts/resources/tools) for the users team
     */
    app.post('/mcp/features', {
        schema: {
            hide: true, // dont show in swagger
            headers: {
                type: 'object',
                properties: {
                    'x-chat-transaction-id': { type: 'string', minLength: 1 }
                },
                required: ['x-chat-transaction-id']
            },
            body: {
                type: 'object',
                properties: {
                    context: {
                        type: 'object',
                        properties: {
                            team: { type: 'string', minLength: 10 }
                        },
                        required: ['team'],
                        additionalProperties: true
                    }
                },
                required: ['context']
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        transactionId: { type: 'string' },
                        servers: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    team: { type: 'string' },
                                    instance: { type: 'string' },
                                    instanceType: { type: 'string', enum: ['instance', 'device'] },
                                    instanceName: { type: 'string' },
                                    mcpServerName: { type: 'string' },
                                    prompts: { type: 'array', items: { type: 'object', additionalProperties: true } },
                                    resources: { type: 'array', items: { type: 'object', additionalProperties: true } },
                                    resourceTemplates: { type: 'array', items: { type: 'object', additionalProperties: true } },
                                    tools: { type: 'array', items: { type: 'object', additionalProperties: true } },
                                    mcpProtocol: { type: 'string', enum: ['http', 'sse'] },
                                    mcpServerUrl: { type: 'string' },
                                    title: { type: 'string' },
                                    version: { type: 'string' },
                                    description: { type: 'string' }
                                },
                                required: ['instance', 'instanceType', 'instanceName', 'mcpServerName', 'prompts', 'resources', 'resourceTemplates', 'tools', 'mcpProtocol'],
                                additionalProperties: false
                            }
                        }
                    },
                    additionalProperties: false
                },
                '4xx': {
                    $ref: 'APIError'
                }
            }
        }
    },
    /**
     * Get MCP capabilities for the user's team
     * @param {import('fastify').FastifyRequest} request
     * @param {import('fastify').FastifyReply} reply
     */
    async (request, reply) => {
        try {
            /** @type {MCPServerItem[]} */
            const runningInstancesWithMCPServer = []
            const transactionId = request.headers['x-chat-transaction-id']
            const mcpCapabilitiesUrl = `${expertUrl.split('/').slice(0, -1).join('/')}/mcp/features`
            const mcpServers = await app.db.models.MCPRegistration.byTeam(request.team.id, { includeInstance: true }) || []

            for (const server of mcpServers) {
                const { name, protocol, endpointRoute, TeamId, Project, Device, title, version, description } = server
                if (TeamId !== request.team.id) {
                    // shouldn't happen due to byTeam filter, but just in case
                    continue
                }
                let owner, ownerId, ownerType
                if (Device) {
                    ownerType = 'device'
                    owner = Device
                    ownerId = Device.hashid
                } else if (Project) {
                    ownerType = 'instance'
                    owner = Project
                    ownerId = Project.id
                } else {
                    continue
                }

                const liveState = await owner.liveState({ omitStorageFlows: true })
                if (liveState?.meta?.state !== 'running') {
                    continue
                }

                runningInstancesWithMCPServer.push({
                    team: request.team.hashid,
                    instance: ownerId,
                    instanceType: ownerType,
                    instanceName: owner.name,
                    instanceUrl: owner.url,
                    mcpServerName: name,
                    mcpEndpoint: endpointRoute,
                    mcpProtocol: protocol,
                    title,
                    version,
                    description
                })
            }
            if (runningInstancesWithMCPServer.length === 0) {
                return reply.send({ servers: [], transactionId })
            }
            const response = await axios.post(mcpCapabilitiesUrl, {
                teamId: request.team.hashid,
                servers: runningInstancesWithMCPServer
            }, {
                headers: {
                    Origin: request.headers.origin,
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

/**
 * @typedef {Object} MCPServerItem MCP server info for a team
 * @property {string} team
 * @property {string} instance
 * @property {string} instanceType
 * @property {string} instanceName
 * @property {string} instanceUrl
 * @property {string} mcpServerName
 * @property {string} mcpEndpoint
 * @property {string} mcpProtocol
 * @property {string} [title]
 * @property {string} [version]
 * @property {string} [description]
*/
