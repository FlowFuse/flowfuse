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

/**
 * @param {import('../../forge.js').ForgeApplication} app
 */
module.exports = async function (app) {
    app.addHook('preHandler', app.verifySession)
    app.addHook('preHandler', async (request, reply) => {
        if (!app.expert.serviceEnabled || !app.expert.expertUrl) {
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
            const teamType = await request.team.getTeamType()
            const teamHttpSecurityFeature = !!teamType.properties.features?.teamHttpSecurity
            request.teamHttpSecurityFeature = teamHttpSecurityFeature
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
        const context = request.body.context || {}

        // If MCP capabilities are provided in the context, filter them based on user access
        const selectedCapabilities = context.selectedCapabilities
        if (selectedCapabilities && Array.isArray(selectedCapabilities) && selectedCapabilities.length > 0) {
            const applicationCache = {}
            const instanceCache = {}
            const mcpServersList = []

            // Premise:
            // If the user has provided a list of MCP servers they wish to use in the chat session,
            // in order of computational cost, we need to:
            // 1. filter out any MCP servers the user does not have access to at all (application level)
            // 2. filter out any MCP server features (prompts/resources/tools) the user does not have access to (feature level)
            // 3. for the remaining MCP servers, load (and cache) the instance and get/create access token as needed
            //    based on the instance's node security settings

            // first pass - get associated applications for the MCP servers selected by user
            for (const server of selectedCapabilities || []) {
                const applicationId = server.application
                if (!applicationId) { continue }

                if (!Object.hasOwnProperty.call(applicationCache, applicationId)) {
                    applicationCache[applicationId] = await app.db.models.Application.byId(applicationId)
                }
                const application = applicationCache[applicationId]
                if (application) {
                    mcpServersList.push({ server, application })
                }
            }

            // second pass - filter features per MCP server based on user access to features (e.g. a tool with the destructive hint requires extra permission than a read-only tool)
            const accessibleServers = filterAccessibleMCPServerFeatures(app, mcpServersList, request.team, request.teamMembership)

            // final pass - now that we have list of accessible servers, apply access tokens as needed
            for (const server of accessibleServers) {
                const instanceId = server.instance
                const instanceType = server.instanceType
                const application = applicationCache[server.application]
                if (!application || !instanceId || !instanceType) { continue }

                // short cut - if the token cache has an entry, use it (avoid loading the instance model)
                server.mcpAccessToken = app.expert.mcp.getCachedToken(instanceId)
                if (server.mcpAccessToken) {
                    continue
                }

                // load instance from local cache or db (an instance can appear multiple times if multiple MCP servers are registered)
                if (!Object.hasOwnProperty.call(instanceCache, instanceId)) {
                    switch (instanceType) {
                    case 'instance':
                        instanceCache[instanceId] = await app.db.models.Project.byId(instanceId)
                        break
                    case 'device':
                        instanceCache[instanceId] = await app.db.models.Device.byId(instanceId)
                        break
                    default:
                        continue
                    }
                }

                const instance = instanceCache[instanceId]
                if (instance) {
                    // sanity check - ensure instance is linked to application
                    if (instance.ApplicationId !== application.id) {
                        server._invalid = true // flag the server as invalid to be filtered out later
                        continue
                    }
                    server.mcpAccessToken = await app.expert.mcp.getOrCreateToken(instance, instanceType, instanceId, request.teamHttpSecurityFeature)
                }
            }
            const filteredAccessibleServers = accessibleServers.filter(s => !s._invalid)
            context.selectedCapabilities = filteredAccessibleServers?.length > 0 ? filteredAccessibleServers : undefined
        }

        let query = request.body.query
        if (request.body.history) {
            query = ''
        }
        try {
            const response = await axios.post(app.expert.expertUrl, {
                query,
                history: request.body.history,
                context: request.body.context
            }, {
                headers: {
                    Origin: request.headers.origin,
                    'X-Chat-Session-ID': sessionId,
                    'X-Chat-Transaction-ID': transactionId,
                    ...(app.expert.serviceToken ? { Authorization: `Bearer ${app.expert.serviceToken}` } : {})
                },
                timeout: app.expert.requestTimeout
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
            // Premise:
            // In order to get the MCP features (prompts/resources/tools) available to the user for their
            // team / application RBACs, in order of computational cost, we need do the following:
            // 1. Get the MCP servers registered for this team
            // 2. For each MCP server
            //    1. Ensure the instance is supposed to be running (i.e. state is 'running')
            //    2. Get the application and check RBAC permits access
            //    3. Ensure the instance is actually running (live state check)
            //    5. For each running instance with MCP server, get/create access token as needed
            //       based on the instance's node security settings
            //    6. Call to backend expert service to get the MCP features for the accessible MCP servers
            //    7. Filter the MCP features based on user RBACs (e.g. destructive tool access)
            // 3. Return the filtered MCP features to the client

            /** @type {MCPServerItem[]} */
            const runningInstancesWithMCPServer = []
            const transactionId = request.headers['x-chat-transaction-id']
            const mcpCapabilitiesUrl = `${app.expert.expertUrl.split('/').slice(0, -1).join('/')}/mcp/features`

            // Get the MCP servers registered for this team
            const mcpServers = await app.db.models.MCPRegistration.byTeam(request.team.id, { includeInstance: true }) || []

            // Scan each MCP server and ensure the user has access to the associated application and that the instance is running
            // then collect the MCP server info for the running instances MCP servers
            // filter out any that the user doesn't have access to
            const applicationCache = {}
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

                // Ensure instance has an associated application
                if (!instance?.ApplicationId) {
                    continue // e.g. skip devices without an application as they can't be validated for access
                }

                // Get the application from local cache or db (an application can appear multiple times if multiple instances are registered)
                const applicationHashid = app.db.models.Application.encodeHashid(instance.ApplicationId)
                if (!Object.hasOwnProperty.call(applicationCache, applicationHashid)) {
                    applicationCache[applicationHashid] = await app.db.models.Application.byId(applicationHashid)
                }
                const application = applicationCache[applicationHashid]
                if (!application) {
                    continue // skip - application not found
                }

                // Now we have the application & know the instance is supposed to be running, check user actually
                // has access before bothering to check instance live state or calling backend for MCP features!
                if (!app.hasPermission(request.teamMembership, 'expert:insights:mcp:allow', { application })) {
                    continue // user doesn't have access to this instance
                }

                // Now we have confirmed access is allowed, check instance is actually running before offering
                // MCP features (querying a non-running instance would cause timeouts)
                const liveState = await instance.liveState({ omitStorageFlows: true })
                if (liveState?.meta?.state !== 'running') {
                    continue
                }

                // Check instance settings for node security. If FlowFuse auth is enabled, generate a short-lived (5 mins)
                // auth token for the instance with a scope limited to MCP access and cache it in memory for subsequent requests
                const mcpAccessToken = await app.expert.mcp.getOrCreateToken(instance, instanceType, instanceId, request.teamHttpSecurityFeature)

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
                    mcpAccessToken,
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
                    ...(app.expert.serviceToken ? { Authorization: `Bearer ${app.expert.serviceToken}` } : {})
                },
                timeout: app.expert.requestTimeout
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
