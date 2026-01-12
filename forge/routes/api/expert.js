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

const { filterAccessibleMCPServerFeatures } = require('../../services/expert.js')

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
            const teamId = request.body.context?.teamId // `context.teamId` is the hash provided in the body context by the client
            if (!teamId) {
                return reply.status(404).send({ code: 'not_found', error: 'Not Found' })
            }
            const existingRole = await request.user.getTeamMembership(teamId)
            if (!existingRole) {
                return reply.status(404).send({ code: 'not_found', error: 'Not Found' })
            }
            request.teamMembership = existingRole
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
                            teamId: { type: 'string', minLength: 10 }
                        },
                        required: ['teamId'],
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
                                    application: { type: 'string' },
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

            // Get the MCP servers registered for this team
            const mcpServers = await app.db.models.MCPRegistration.byTeam(request.team.id, { includeInstance: true }) || []

            // Scan each MCP server and ensure the user has access to the associated application and that the instance is running
            // then collect the MCP server info for the running instances MCP servers
            // filter out any that the user doesn't have access to
            const applicationCache = {}
            const instanceToApplicationLookup = {}
            for (const server of mcpServers) {
                const { name, protocol, endpointRoute, TeamId, Project, Device, title, version, description } = server
                if (TeamId !== request.team.id) {
                    // shouldn't happen due to byTeam filter, but just in case
                    continue
                }
                let instance, instanceId, instanceType
                if (Device) {
                    instanceType = 'device'
                    instance = Device
                    instanceId = Device.hashid
                } else if (Project) {
                    instanceType = 'instance'
                    instance = Project
                    instanceId = Project.id
                } else {
                    continue
                }

                // if instance is not expected to be running, skip it (avoids unnecessary timeouts)
                if (instance?.state !== 'running') {
                    continue
                }

                // Ensure an application is linked to this instance
                const applicationId = app.db.models.Application.encodeHashid(instance.ApplicationId)
                if (!applicationId) {
                    continue // e.g. skip devices without an application as they can't be validated for access
                }
                if (!applicationCache[applicationId]) {
                    const applicationModel = await app.db.models.Application.byId(applicationId)
                    applicationCache[applicationId] = applicationModel
                }
                const application = applicationCache[applicationId]
                if (!application) {
                    continue // skip - application not found
                }
                instanceToApplicationLookup[instanceId] = application

                // Now we have the application & know it is supposed to be running, check user actually has access
                // before bothering to check instance live state or calling backend for MCP features!
                if (!app.hasPermission(request.teamMembership, 'expert:insights:mcp:allow', { application })) {
                    continue // user doesn't have access to this instance
                }

                // Now we have confirmed access is allowed, double check instance is running before offering MCP features (will avoid timeouts)
                const liveState = await instance.liveState({ omitStorageFlows: true })
                if (liveState?.meta?.state !== 'running') {
                    continue
                }

                runningInstancesWithMCPServer.push({
                    team: request.team.hashid,
                    application: application.hashid,
                    instance: instanceId,
                    instanceType,
                    instanceName: instance.name,
                    instanceUrl: instance.url,
                    mcpServerName: name,
                    mcpEndpoint: endpointRoute,
                    mcpProtocol: protocol,
                    title,
                    version,
                    description
                })
            }

            // if no running instances with MCP server, return early
            if (runningInstancesWithMCPServer.length === 0) {
                return reply.send({ servers: [], transactionId })
            }

            // Call to backend to request MCP capabilities from expert service
            // For reference - this POST:
            // * calls the backend expert service endpoint /mcp/features
            // * it connects to each MCP server registered
            // * retrieves the prompts/resources/tools
            // * adds them to the response along with the MCP server info
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
            const mcpServersResponse = response.data.servers || []
            const serverList = []
            // load the associate application models so that we can filter features based on user access
            for (const serverItem of mcpServersResponse) {
                const application = applicationCache[serverItem.application]
                if (application) {
                    // should allays be an application due to prior checks
                    // skip this as bad data
                    serverList.push({
                        server: serverItem,
                        application
                    })
                }
            }
            // now check tools/resources/prompts access per server based on team membership
            response.data.servers = filterAccessibleMCPServerFeatures(app, serverList, request.team, request.teamMembership)

            reply.send(response.data)
        } catch (error) {
            reply.code(error.response?.status || 500).send({ code: error.response?.data?.code || 'unexpected_error', error: error.response?.data?.error || error.message })
        }
    })
}

/**
 * @typedef {Object} MCPServerItem MCP server info for a team
 * @property {string} team
 * @property {string} application
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
