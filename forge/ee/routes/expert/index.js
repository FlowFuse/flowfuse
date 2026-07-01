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

const { filterAccessibleMCPServerFeatures } = require('../../../services/expert.js')

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
            // Ensure users team access is valid. `teamId` is the team hash provided by the
            // client — in the body context for POST routes (/chat, /mcp/features) or as a
            // query param for GET routes (/mcp/tools, which has no body).
            const teamId = request.body?.context?.teamId || request.query?.teamId
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

            // Check AI and expert feature flags at platform and team level
            await request.team.ensureTeamTypeExists()
            const isAiEnabled = !!(app.config.features.enabled('ai') && request.team.getFeatureProperty('ai', true))
            if (!isAiEnabled) {
                return reply.status(404).send({ code: 'not_found', error: 'Not Found' })
            }
            const isExpertAssistantEnabled = !!(app.config.features.enabled('expertAssistant') && request.team.getFeatureProperty('expertAssistant', true))
            const isExpertInsightsEnabled = !!(app.config.features.enabled('expertInsights') && request.team.getFeatureProperty('expertInsights', true))
            if (!isExpertAssistantEnabled && !isExpertInsightsEnabled) {
                return reply.status(404).send({ code: 'not_found', error: 'Not Found' })
            }
            request.isExpertAssistantEnabled = isExpertAssistantEnabled
            request.isExpertInsightsEnabled = isExpertInsightsEnabled
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
            const mcpServersList = []

            // Premise:
            // If the user has provided a list of MCP servers they wish to use in the chat session,
            // in order of computational cost, we need to:
            // 1. filter out any MCP servers the user does not have access to at all (application level)
            // 2. filter out any MCP server features (prompts/resources/tools) the user does not have access to (feature level)
            // 3. re-resolve the remaining MCP servers against the team's trusted MCP registry, verify
            //    instance/application ownership, and get/create access tokens as needed based on the
            //    instance's node security settings

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

            // Build the team's trusted MCP registry. This is the source of truth for which MCP servers
            // exist and their transport details (instance, endpoint, protocol). The client-supplied
            // transport fields (e.g. mcpServerUrl, instanceUrl, mcpEndpoint) are NEVER trusted - they
            // are re-resolved from here so a user cannot point a minted access token at an arbitrary
            // URL, nor attach a token for an instance they have not been authorised against.
            // (mirrors the /mcp/features route)
            const registrations = await app.db.models.MCPRegistration.byTeam(request.team.id, { includeInstance: true }) || []
            const trustedRegistrations = new Map()
            for (const reg of registrations) {
                if (reg.targetType !== 'instance' || !reg.Project) {
                    continue
                } // devices are not yet supported for MCP servers
                trustedRegistrations.set(`${reg.Project.id}::${reg.name}`, reg)
            }

            // final pass - re-resolve each accessible server against the trusted registry, verify
            // instance/application ownership, then apply access tokens as needed
            for (const server of accessibleServers) {
                const application = applicationCache[server.application]
                if (!application || !server.instance) {
                    server._invalid = true // flag the server as invalid to be filtered out later
                    continue
                }

                // re-resolve against the trusted registry - drops any selection that is not a
                // registered MCP server for this team
                const registration = trustedRegistrations.get(`${server.instance}::${server.mcpServerName}`)
                const instance = registration?.Project
                if (!instance) {
                    server._invalid = true
                    continue
                }

                // SECURITY: the registered instance must belong to the claimed application (the user was
                // only permission-checked against the claimed application in the second pass). This
                // ownership check MUST happen BEFORE reading or minting any access token, because the
                // token cache is keyed by instanceId alone.
                if (instance.ApplicationId !== application.id) {
                    server._invalid = true
                    continue
                }

                const instanceType = registration.targetType // trusted instance type ('instance')

                // Tamper detection (audit signal only - we overwrite with trusted values regardless).
                // A well-behaved client echoes back the transport details we issued via /mcp/features,
                // so any disagreement indicates either a stale client or tampering. We log it rather
                // than reject, to avoid failing legitimate requests in a race condition. mcpServerUrl is
                // not compared - FlowFuse never issues it as an authoritative field (the agent builds
                // it client-side), so it is simply dropped below.
                const tamperedFields = []
                if (server.instanceUrl !== undefined && server.instanceUrl !== instance.url) { tamperedFields.push('instanceUrl') }
                if (server.mcpEndpoint !== undefined && server.mcpEndpoint !== registration.endpointRoute) { tamperedFields.push('mcpEndpoint') }
                if (server.mcpProtocol !== undefined && server.mcpProtocol !== registration.protocol) { tamperedFields.push('mcpProtocol') }
                if (tamperedFields.length > 0) {
                    app.log.warn(`Expert chat: correcting client-supplied MCP transport fields [${tamperedFields.join(', ')}] that did not match the trusted registry (user=${request.user.hashid}, team=${request.team.hashid}, instance=${instance.id})`)
                }

                // Overwrite all transport/identity fields with trusted values - never trust the client's
                // copy. The agent rebuilds mcpServerUrl from instanceUrl + mcpEndpoint, as it does for
                // the /mcp/features response.
                server.team = request.team.hashid
                server.application = application.hashid
                server.instanceType = instanceType
                server.instanceName = instance.name
                server.instanceUrl = instance.url
                server.mcpServerName = registration.name
                server.mcpEndpoint = registration.endpointRoute
                server.mcpProtocol = registration.protocol
                server.title = registration.title
                server.version = registration.version
                server.description = registration.description
                delete server.mcpServerUrl

                // ownership verified - safe to read/create the cached access token for this instance
                server.mcpAccessToken = await app.expert.mcp.getOrCreateToken(instance, instanceType, instance.id, request.teamHttpSecurityFeature)
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
                // Kept open: fast-json-stringify strips undeclared fields, but Ajv
                // response-validation runs before that — locking would reject stripped fields.
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
                                required: ['instance', 'instanceType', 'instanceName', 'mcpServerName', 'prompts', 'resources', 'resourceTemplates', 'tools', 'mcpProtocol']
                            }
                        }
                    }
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
        if (!request.isExpertInsightsEnabled) {
            return reply.status(404).send({ code: 'not_found', error: 'Not Found' })
        }

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
                    // instanceType = 'device'
                    // instance = Device
                    // instanceId = Device.hashid
                    continue // Devices are not yet supported for MCP servers
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
                if (instance.liveState) {
                    const liveState = await instance.liveState({ omitStorageFlows: true })
                    if (liveState?.meta?.state !== 'running') {
                        continue
                    }
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

    /**
     * Retrieve the curated tool catalog for the Expert's human-in-the-loop permissions UI
     * (#421). Returns the merged catalog for both sections the UI shows:
     * - flow-building tools, proxied from the agent service's /mcp/flow-tools endpoint
     *   (friendly catalog entries only — raw MCP identifiers never leave the backend);
     * - FlowFuse platform tools, curated here from the platform automation handler
     *   (wired but commented out until the mcp-over-mqtt branch lands — see below).
     * A `hash` fingerprint of the flow-building catalog rides along so the browser refetches
     * only when it changes. Team access + feature gating are enforced by the shared
     * preHandler above; read/write classification on each entry is what the client uses to
     * decide which tools a role may enable.
     */
    app.get('/mcp/tools', {
        schema: {
            hide: true, // dont show in swagger
            querystring: {
                type: 'object',
                properties: {
                    teamId: { type: 'string', minLength: 10 }
                },
                required: ['teamId']
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        catalog: {
                            type: 'array',
                            items: {
                                type: 'object',
                                additionalProperties: true
                            }
                        },
                        hash: {
                            type: ['string', 'null']
                        }
                    }
                },
                '4xx': {
                    $ref: 'APIError'
                }
            }
        }
    },
    async (request, reply) => {
        if (!request.isExpertAssistantEnabled) {
            return reply.status(404).send({ code: 'not_found', error: 'Not Found' })
        }
        try {
            const toolsUrl = `${app.expert.expertUrl.split('/').slice(0, -1).join('/')}/mcp/flow-tools`
            const response = await axios.get(toolsUrl, {
                headers: {
                    Origin: request.headers.origin,
                    ...(app.expert.serviceToken ? { Authorization: `Bearer ${app.expert.serviceToken}` } : {})
                },
                timeout: app.expert.requestTimeout
            })
            const catalog = response.data?.catalog || []

            // TODO(platform-tools): enable once the mcp-over-mqtt branch merges, which adds
            // forge/comms/platformAutomation.js. Platform tools are global (no per-team
            // filtering); getToolDefinitions() is synchronous and takes no args. Curate each
            // into a catalog entry tagged group:'platform' so the UI routes it to the
            // FlowFuse Platform Tools section (groupOf() in the product-assistant store).
            // const { PlatformAutomationHandler } = require('../../../comms/platformAutomation')
            // const platformDefs = PlatformAutomationHandler(app).getToolDefinitions()
            // catalog.push(...platformDefs.map(curatePlatformTool))
            //
            // curatePlatformTool maps the platform wire shape to a catalog entry. Platform
            // tools carry standard MCP annotations (readOnlyHint / destructiveHint), which
            // give the read/write/delete class. They don't run in Node-RED, so they have no
            // nr-assistant version window — no minVersion/maxVersion (the UI treats their
            // absence as always-available).
            // function curatePlatformTool (def) {
            //     const a = def.annotations || {}
            //     const readOnly = a.readOnlyHint === true
            //     const destructive = a.destructiveHint === true
            //     return {
            //         key: def.name,
            //         // TODO(platform-tools): confirm a friendly title source at merge; for now
            //         // derive from the name (strip the platform_ prefix, title-case the rest).
            //         name: def.name.replace(/^platform_/, '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
            //         toolClass: readOnly ? 'read' : (destructive ? 'delete' : 'write'),
            //         destructive,
            //         group: 'platform'
            //     }
            // }

            reply.send({ catalog, hash: response.data?.hash || null })
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
