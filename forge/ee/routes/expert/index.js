/**
 * Expert api routes
 *
 * - /api/v1/expert
 *
 * @namespace expert
 * @memberof forge.routes.api
 */
const { default: axios } = require('axios')
const semver = require('semver')
const { v4: uuidv4 } = require('uuid')

const { filterAccessibleMCPServerFeatures } = require('../../../services/expert.js')
/** @type {typeof import('../../../comms/devices.js').DeviceCommsHandler} */
const getDeviceComms = (app) => { return app.comms?.devices }

/**
 * Maps a platform automation tool's wire definition into a catalog entry for the
 * Expert permissions UI. The read/write/delete class comes from the MCP annotations
 * (readOnlyHint / destructiveHint), and `group: 'platform'` routes it to the platform
 * section. The label is the tool's own `title`, falling back to a name-derived label.
 */
const curatePlatformTool = (def) => {
    const annotations = def.annotations || {}
    const readOnly = annotations.readOnlyHint === true
    const destructive = annotations.destructiveHint === true
    return {
        key: def.name,
        name: def.title || def.name.replace(/^platform_/, '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        description: def.description,
        toolClass: readOnly ? 'read' : (destructive ? 'delete' : 'write'),
        destructive,
        group: 'platform'
    }
}

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
            const mcpServerIds = []
            for (const server of selectedCapabilities || []) {
                const { application: applicationId, mcpServer } = server
                if (!applicationId || !mcpServer) { continue }
                if (!Object.hasOwnProperty.call(applicationCache, applicationId)) {
                    applicationCache[applicationId] = await app.db.models.Application.byId(applicationId)
                }
                const application = applicationCache[applicationId]
                if (application) {
                    mcpServerIds.push(mcpServer)
                    mcpServersList.push({ server, application })
                }
            }

            // second pass - filter features per MCP server based on user access to features (e.g. a tool with the destructive hint requires extra permission than a read-only tool)
            const accessibleServers = filterAccessibleMCPServerFeatures(app, mcpServersList, request.team, request.teamMembership)

            // Build the team's trusted MCP registry. This is the source of truth for which MCP servers
            // exist and their transport details (instance, endpoint, protocol). The client-supplied
            // transport fields are NEVER trusted - they should always be re-resolved from the trusted registry.
            const registrations = await app.db.models.MCPRegistration.byTeam(request.team.id, { includeInstance: true, filterId: mcpServerIds }) || []
            const trustedRegistrations = new Map()
            for (const reg of registrations) {
                if (reg.targetType === 'instance' && reg.Project) {
                    trustedRegistrations.set(`${reg.Project.id}::${reg.hashid}`, reg)
                } else if (reg.targetType === 'device' && reg.Device) {
                    trustedRegistrations.set(`${reg.Device.hashid}::${reg.hashid}`, reg)
                } else {
                    continue
                }
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
                const registration = trustedRegistrations.get(`${server.instance}::${server.mcpServer}`)
                const instance = registration?.Project || registration?.Device
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

                // Overwrite all transport/identity fields with trusted values - never trust the client's
                // copy. The agent rebuilds mcpServerUrl from instanceUrl + mcpEndpoint, as it does for
                // the /mcp/features response.
                server.team = request.team.hashid
                server.application = application.hashid
                server.instanceType = instanceType
                server.instanceName = instance.name
                server.instanceUrl = instance.url
                server.mcpServer = registration.hashid
                server.mcpServerName = registration.name
                server.mcpEndpoint = registration.endpointRoute
                server.mcpProtocol = registration.protocol
                server.title = registration.title
                server.version = registration.version
                server.description = registration.description
                delete server.mcpServerUrl

                // ownership verified - safe to read/create the cached access token for this instance
                const idString = instanceType === 'instance' ? instance.id : instance.hashid
                server.mcpAccessToken = await app.expert.mcp.getOrCreateToken(instance, instanceType, idString, request.teamHttpSecurityFeature)
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
                    'X-Chat-Namespace-ID': app.license.get('id'),
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
                                    mcpServer: { type: 'string' },
                                    mcpServerName: { type: 'string' },
                                    prompts: { type: 'array', items: { type: 'object', additionalProperties: true } },
                                    resources: { type: 'array', items: { type: 'object', additionalProperties: true } },
                                    resourceTemplates: { type: 'array', items: { type: 'object', additionalProperties: true } },
                                    tools: { type: 'array', items: { type: 'object', additionalProperties: true } },
                                    title: { type: 'string' },
                                    version: { type: 'string' },
                                    description: { type: 'string' }
                                },
                                required: ['instance', 'instanceType', 'instanceName', 'mcpServer', 'mcpServerName', 'prompts', 'resources', 'resourceTemplates', 'tools']
                            }
                        },
                        incompatibleServers: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    instance: { type: 'string' },
                                    instanceType: { type: 'string', enum: ['instance', 'device'] },
                                    instanceName: { type: 'string' },
                                    currentVersion: { type: 'string' },
                                    minimumSupportedVersion: { type: 'string' }
                                },
                                required: ['instance', 'instanceType']
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

            const transactionId = request.headers['x-chat-transaction-id']
            const deviceComms = getDeviceComms(app)

            // Get the MCP servers registered for this team
            const mcpServers = await app.db.models.MCPRegistration.byTeam(request.team.id, { includeInstance: true }) || []

            // PASS 1 - group registrations by instance.
            // An instance can have multiple MCP servers registered, but the expensive per-instance work
            // (live-state check + access token) should only run once per instance. So here we do only the
            // cheap checks (team match, expected state, application access) and group the registrations by
            // instance. The live-state check / token retrieval happens once per instance in pass 2.
            /** @type {Object<string, { instance: any, instanceType: 'instance'|'device', application: any, registrations: any[] }>} */
            const instanceGroups = {}
            const applicationCache = {}
            for (const server of mcpServers) {
                const { hashid, name, protocol, endpointRoute, TeamId, Project, Device, title, version, description } = server
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

                // Group the registration under its instance so per-instance work runs only once in pass 2
                if (!instanceGroups[instanceId]) {
                    instanceGroups[instanceId] = { instance, instanceType, application, registrations: [] }
                }
                instanceGroups[instanceId].registrations.push({ hashid, name, protocol, endpointRoute, title, version, description })
            }

            // PASS 2 - for each unique instance, confirm instance is actually running (live-state check) and that
            // the instance's launcher/agent version is new enough to support MCP features.
            const instancesWithMCPServers = []
            const incompatibleServers = []
            const MIN_HOSTED_INSTANCE_LAUNCHER_VERSION = '2.32.0'
            const MIN_REMOTE_INSTANCE_AGENT_VERSION = '4.0.0'

            for (const instanceId of Object.keys(instanceGroups)) {
                try {
                    const { instance, instanceType, application, registrations } = instanceGroups[instanceId]
                    // check instance is actually running before offering MCP features (querying a non-running instance would cause timeouts)
                    // additionally, check that the instance's launcher/agent version is new enough to support MCP features.
                    // note: the version check can only be done after the live-state check, because the version is only available in the live-state response.

                    if (instanceType === 'instance' && instance) {
                        // Check that instance launcher supports the required features before attempting to get the live state.
                        if (!instance.versions?.launcher?.current || semver.lt(instance.versions.launcher.current, MIN_HOSTED_INSTANCE_LAUNCHER_VERSION)) {
                            incompatibleServers.push({ instance: instanceId, instanceType, instanceName: instance.name, currentVersion: instance.versions?.launcher?.current, minimumSupportedVersion: MIN_HOSTED_INSTANCE_LAUNCHER_VERSION })
                            continue // skip - launcher version too old to support MCP features via the admin API
                        }
                        // Next check that the instance is actually running before calling MCP features (querying a non-running instance would cause timeouts)
                        const liveState = await instance.liveState({ omitStorageFlows: true })
                        if (liveState?.meta?.state !== 'running') {
                            continue
                        }
                    } else if (instanceType === 'device' && instance) {
                        // Check that device agent version supports the required features before attempting to get the live state.
                        if (!instance.agentVersion || semver.lt(instance.agentVersion, MIN_REMOTE_INSTANCE_AGENT_VERSION)) {
                            incompatibleServers.push({ instance: instanceId, instanceType, instanceName: instance.name, currentVersion: instance.agentVersion, minimumSupportedVersion: MIN_REMOTE_INSTANCE_AGENT_VERSION })
                            continue // skip - agent version too old to support MCP features
                        }
                        // Next check that the device is actually running before offering MCP features (querying a non-running device would cause timeouts)
                        const response = await deviceComms.sendCommandAwaitReply(request.team.hashid, instanceId, 'get-liveState', {}, { timeout: 3000 })
                        if (response?.state !== 'running') {
                            continue
                        }
                    } else {
                        continue // unsupported instance type or instance not found, skip it.
                    }

                    // Check instance settings for node security. If FlowFuse auth is enabled, generate a short-lived (5 mins)
                    // auth token for the instance with a scope limited to MCP access and cache it in memory for subsequent requests
                    const mcpAccessToken = await app.expert.mcp.getOrCreateToken(instance, instanceType, instanceId, request.teamHttpSecurityFeature)

                    instancesWithMCPServers.push({
                        team: request.team.hashid,
                        application: application.hashid,
                        instance,
                        instanceType,
                        mcpServers: registrations.map(reg => ({
                            team: request.team.hashid,
                            application: application.hashid,
                            instance: instanceId,
                            instanceType,
                            instanceName: instance.name,
                            instanceUrl: instance.url,
                            mcpServer: reg.hashid,
                            mcpServerName: reg.name,
                            mcpEndpoint: reg.endpointRoute,
                            mcpProtocol: reg.protocol,
                            mcpAccessToken,
                            accessToken: mcpAccessToken,
                            title: reg.title,
                            version: reg.version,
                            description: reg.description
                        }))
                    })
                } catch (error) {
                    continue // if we get an error trying, assume instance is offline/unreachable and skip it
                }
            }

            // if no running instances with MCP server, return early
            if (instancesWithMCPServers.length === 0) {
                return reply.send({ servers: [], incompatibleServers, transactionId })
            }

            // Request the features via the launcher (remote instances via MQTT, hosted instances via direct
            // call to launcher admin API), one call per instance, all in parallel.
            const featurePromises = instancesWithMCPServers.map(instanceWithMCPServers => {
                // for HTTP protocol, we can call the launcher admin API directly (for hosted instances) or via MQTT (for remote instances)
                const instance = instanceWithMCPServers.instance
                if (!instance) {
                    return Promise.resolve({ ...instanceWithMCPServers, error: 'Instance not found' })
                }
                if (instanceWithMCPServers.instanceType === 'instance') {
                    // hosted instance - call launcher API
                    return app.containers.getMCPFeatures(instance, instanceWithMCPServers.mcpServers)
                } else if (instanceWithMCPServers.instanceType === 'device') {
                    // remote instance - call via command await dispatcher
                    return deviceComms.sendCommandAwaitReply(instanceWithMCPServers.team, instance.hashid, 'mcp:get-features', { mcpEndPoints: instanceWithMCPServers.mcpServers }, { timeout: 10000 })
                } else {
                    return Promise.resolve({ ...instanceWithMCPServers, error: 'Unsupported instance type' })
                }
            })

            // wait for all promises to resolve
            const featuresResponses = await Promise.all(featurePromises)
            const mcpServersResponse = (featuresResponses || []).flat()

            const serverList = []
            // load the associate application models so that we can filter features based on user access
            for (const serverItem of mcpServersResponse) {
                const application = applicationCache[serverItem.spec.application]
                if (application) {
                    serverList.push({
                        server: { ...serverItem.features, ...serverItem.spec },
                        application
                    })
                }
            }
            // now check tools/resources/prompts access per server based on team membership
            // response.data.servers = filterAccessibleMCPServerFeatures(app, serverList, request.team, request.teamMembership)
            const finalServers = filterAccessibleMCPServerFeatures(app, serverList, request.team, request.teamMembership)
            const finalServersView = finalServers.map(s => {
                return {
                    // ownership info
                    team: s.team,
                    application: s.application,
                    instance: s.instance,
                    instanceType: s.instanceType,
                    instanceName: s.instanceName,
                    // mcp info
                    mcpServer: s.mcpServer, // the MCP Servers ID - for keying the UI list and for the client to send back in the chat context to select which MCP server to use for a given query
                    title: s.title || s.mcpServerName || s.mcpServer,
                    description: s.description,
                    mcpServerName: s.mcpServerName,
                    version: s.version,
                    tools: s.tools,
                    resources: s.resources,
                    resourceTemplates: s.resourceTemplates,
                    prompts: s.prompts
                }
            })
            reply.send({ servers: finalServersView, incompatibleServers, transactionId })
        } catch (error) {
            reply.code(error.response?.status || 500).send({ code: error.response?.data?.code || 'unexpected_error', error: error.response?.data?.error || error.message })
        }
    })

    /**
     * Returns the merged tool catalog for the Expert permissions UI: flow-building tools
     * proxied from the agent's /mcp/flow-tools endpoint, plus curated platform tools. A
     * `hash` of the flow-building catalog rides along so the browser refetches only when
     * it changes. Team access and feature gating are enforced by the shared preHandler.
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

            // Merge in the FlowFuse platform tools. They are global (no per-team filtering)
            // and served from the handler singleton already constructed on app.comms, so we
            // reuse it rather than newing one up — constructing re-registers its MQTT event
            // listener. getToolDefinitions() is synchronous and takes no args.
            const platformHandler = app.comms?.platformAutomation
            if (platformHandler) {
                const platformDefs = platformHandler.getToolDefinitions() || []
                catalog.push(...platformDefs.map(curatePlatformTool))
            }

            reply.send({ catalog, hash: response.data?.hash || null })
        } catch (error) {
            // The tool catalog is a non-fatal enhancement (the client swallows failures and
            // gates safely with defaults). Never forward an upstream auth failure as our own
            // 401. The SPA's axios interceptor treats any 401 as session-expiry and logs the
            // user out, which an unrelated expert-service token rejection must not trigger.
            const upstreamStatus = error.response?.status
            app.log.warn(`[expert/mcp/tools] upstream tool-catalog fetch failed: status=${upstreamStatus} msg=${error.message}`)
            if (upstreamStatus === 401 || upstreamStatus === 403) {
                return reply.send({ catalog: [], hash: null })
            }
            reply.code(upstreamStatus || 500).send({ code: error.response?.data?.code || 'unexpected_error', error: error.response?.data?.error || error.message })
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
 * @property {string} mcpServer
 * @property {string} mcpServerName
 * @property {string} mcpEndpoint
 * @property {string} mcpProtocol
 * @property {string} [title]
 * @property {string} [version]
 * @property {string} [description]
*/
