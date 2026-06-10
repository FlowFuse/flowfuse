'use strict'

const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js')
const { StreamableHTTPServerTransport } = require('@modelcontextprotocol/sdk/server/streamableHttp.js')
const { z } = require('zod')

const { FlowBuildingBridge } = require('../../lib/mcp/flowBuildingBridge')
const { MqttDispatch } = require('../../lib/mcp/mqttDispatch')
const PlatformAutomations = require('../../lib/mcp/platformAutomations')

/**
 * MCP Server route — exposes the FlowFuse platform as an MCP-compatible endpoint.
 *
 * Mounted at: /api/v1/mcp
 *
 * The endpoint is stateless: a fresh McpServer and transport are created per request.
 * Authentication is enforced by the preHandler hook inherited from the parent EE routes
 * (app.verifySession), plus the additional check below that requires a session User.
 *
 * @param {import('../../../forge').ForgeApplication} app
 */
module.exports = async function (app) {
    const platformAutomations = new PlatformAutomations()
    platformAutomations.init(app)

    // Initialise the FlowBuildingBridge singleton
    if (!app.flowBuildingBridge) {
        app.decorate('flowBuildingBridge', new FlowBuildingBridge(app))
    }

    // Initialise the MqttDispatch singleton (for external MCP client flow tool dispatch)
    if (!app.mqttDispatch) {
        app.decorate('mqttDispatch', new MqttDispatch(app))
    }

    // Require a session user (Bearer token / session cookie) for all MCP requests
    app.addHook('preHandler', async (request, reply) => {
        if (!request.session?.User) {
            const baseUrl = app.config.base_url
            reply.header('WWW-Authenticate', `Bearer resource_metadata="${baseUrl}/.well-known/oauth-protected-resource"`)
            reply.code(401).send({ code: 'unauthorized', error: 'Unauthorized' })
            throw new Error('Unauthorized')
        }
        // Flag requests from external MCP clients (Bearer token, not cookie session).
        // The auth middleware deletes scope for named tokens, so check the Authorization header directly.
        const authHeader = request.headers.authorization
        request.session.viaMCPToken = !!(authHeader && authHeader.startsWith('Bearer '))
    })

    /**
     * Find an active editor session for the given user across all accessible instances.
     * Returns { session, projectId } or null.
     *
     * @param {import('sequelize').Model} user
     * @returns {Promise<{ session: object, projectId: string } | null>}
     */
    async function findUserEditorSession (user) {
        const editorSessions = app.comms?.editorSessions
        if (!editorSessions) return null

        const userHashid = user.hashid || user.id

        // Look up the user's teams, then their instances, and check for an active session
        const teamMemberships = await app.db.models.Team.forUser(user)
        for (const membership of teamMemberships) {
            const team = membership.Team || membership
            const teamId = team.hashid || app.db.models.Team.encodeHashid(team.id)
            const applications = await app.db.models.Application.byTeam(teamId)
            for (const application of applications) {
                const instances = await app.db.models.Project.byApplication(application.hashid)
                if (!instances) continue
                for (const instance of instances) {
                    const session = editorSessions.getActiveSession(instance.id)
                    if (session && String(session.userId) === String(userHashid)) {
                        return { session, projectId: instance.id }
                    }
                }
            }
        }
        return null
    }

    /**
     * POST / — MCP JSON-RPC endpoint (stateless Streamable HTTP transport)
     */
    app.post('/', {
        schema: { hide: true }
    }, async (request, reply) => {
        const user = request.session.User
        const isExternalClient = !!request.session.viaMCPToken

        // Create a per-request MCP server instance (stateless mode)
        const mcpServer = new McpServer({
            name: 'FlowFuse Platform',
            version: '1.0.0'
        })

        // Register all platform tools
        for (const [toolName, toolDef] of Object.entries(platformAutomations.supportedActions)) {
            mcpServer.registerTool(
                toolName,
                {
                    description: toolDef.description,
                    inputSchema: toolDef.inputSchema,
                    annotations: toolDef.annotations
                },
                async (params) => {
                    try {
                        const result = await platformAutomations.invokeAction(toolName, {
                            user,
                            params,
                            app,
                            viaMCPToken: request.session.viaMCPToken,
                            headers: request.headers,
                            cookies: request.cookies
                        })
                        return {
                            content: [{ type: 'text', text: JSON.stringify(result || {}) }]
                        }
                    } catch (err) {
                        app.log.error(`MCP tool ${toolName} error: ${err.message}`)
                        return {
                            content: [{ type: 'text', text: JSON.stringify({ error: err.message }) }],
                            isError: true
                        }
                    }
                }
            )
        }

        // Register flow-building tools if the bridge is configured.
        // Always register them so stateless clients see them in tools/list;
        // the editor-session check happens at call time in handleFlowToolCall.
        const flowBridge = app.flowBuildingBridge
        if (flowBridge?.isConfigured) {
            let flowTools = []
            try {
                flowTools = await flowBridge.getTools()
            } catch (err) {
                app.log.warn(`MCP: failed to fetch flow tools: ${err.message}`)
            }
            for (const flowTool of flowTools) {
                // External clients must specify which instance to target
                const toolSchema = isExternalClient
                    ? flowTool.inputSchema.extend({
                        instanceId: z.string().describe('The ID of the instance to modify (from platform.list-instances)')
                    })
                    : flowTool.inputSchema

                mcpServer.registerTool(
                    flowTool.name,
                    {
                        description: flowTool.description,
                        inputSchema: toolSchema,
                        annotations: flowTool.annotations
                    },
                    async (params) => {
                        return handleFlowToolCall(flowTool, params, user, isExternalClient)
                    }
                )
            }
        }

        // Create a stateless transport (no session ID)
        const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined })

        await mcpServer.connect(transport)

        // Tell Fastify we are handling the response ourselves
        reply.hijack()

        // Delegate the raw Node.js request/response to the MCP transport.
        // Fastify has already parsed the JSON body; pass it as parsedBody so the
        // transport does not attempt to re-read the consumed stream.
        await transport.handleRequest(request.raw, reply.raw, request.body)
    })

    /**
     * Handle a flow.* tool call.
     *
     * 1. Verify the user still has an active editor session
     * 2. Call the flow building bridge to get validated actions
     * 3. Expert path: return as-is (the expert agent handles MQTT dispatch)
     * 4. External client path: dispatch actions to the browser via MQTT, wait for results
     *
     * @param {object} flowTool - Tool definition from FlowBuildingBridge
     * @param {object} params - Tool call parameters
     * @param {import('sequelize').Model} user - Authenticated user
     * @param {boolean} isExternalClient - Whether this is from an external MCP client
     * @returns {Promise<object>} MCP tool result
     */
    async function handleFlowToolCall (flowTool, params, user, isExternalClient) {
        try {
            let editorSession, projectId

            if (isExternalClient) {
                // External clients must specify which instance to target
                const { instanceId, ...toolParams } = params
                if (!instanceId) {
                    return {
                        isError: true,
                        content: [{ type: 'text', text: 'instanceId is required for flow tools' }]
                    }
                }

                const editorSessions = app.comms?.editorSessions
                const session = editorSessions?.getActiveSession(instanceId)
                if (!session) {
                    return {
                        isError: true,
                        content: [{ type: 'text', text: 'the instance editor must be open in your browser to modify flows' }]
                    }
                }

                const userHashid = user.hashid || user.id
                if (String(session.userId) !== String(userHashid)) {
                    return {
                        isError: true,
                        content: [{ type: 'text', text: 'no active editor session found for this user on this instance' }]
                    }
                }

                editorSession = session
                projectId = instanceId
                params = toolParams
            } else {
                // Expert path: find any active editor session for this user
                const editorInfo = await findUserEditorSession(user)
                if (!editorInfo) {
                    return {
                        isError: true,
                        content: [{ type: 'text', text: 'the instance editor must be open in your browser to modify flows' }]
                    }
                }
                editorSession = editorInfo.session
                projectId = editorInfo.projectId
            }

            // MCP clients may serialize array/object params as JSON strings
            // when the tool schema lacks explicit property types (the Zod
            // passthrough schema produces {"properties":{},"type":"object"}).
            // Parse them back before forwarding to the flow building server.
            const normalizedParams = {}
            for (const [key, value] of Object.entries(params)) {
                if (typeof value === 'string' && (value.startsWith('[') || value.startsWith('{'))) {
                    try { normalizedParams[key] = JSON.parse(value) } catch (_) { normalizedParams[key] = value }
                } else {
                    normalizedParams[key] = value
                }
            }

            // Call the flow building bridge to get validated actions
            const bridgeResult = await app.flowBuildingBridge.callTool(flowTool.originalName, normalizedParams)

            if (!isExternalClient) {
                // Expert path: return as-is for the expert agent to handle MQTT dispatch
                return bridgeResult
            }

            // External client path: check if the result contains actions that
            // need to be dispatched to the browser
            const resultContent = bridgeResult?.content
            let resultData = null
            if (Array.isArray(resultContent)) {
                const textItem = resultContent.find(c => c.type === 'text')
                if (textItem) {
                    try { resultData = JSON.parse(textItem.text) } catch (_) {}
                }
            }

            // If the result has actions, dispatch each one to the browser via MQTT
            if (resultData?.actions && Array.isArray(resultData.actions)) {
                const mqttDispatch = app.mqttDispatch
                const results = []

                for (const action of resultData.actions) {
                    const actionName = action.action || action.name || flowTool.originalName
                    const actionParams = action.params || action
                    // Convert action name format: 'automation/add-nodes' -> 'automation:add-nodes'
                    const inflightType = actionName.replace(/\//g, ':')

                    try {
                        const actionResult = await mqttDispatch.dispatchAndWait(
                            editorSession,
                            projectId,
                            inflightType,
                            actionParams
                        )
                        results.push({ action: actionName, success: true, result: actionResult })
                    } catch (err) {
                        results.push({ action: actionName, success: false, error: err.message })
                    }
                }

                return {
                    content: [{ type: 'text', text: JSON.stringify({ actions: results }) }]
                }
            }

            // No actions to dispatch — return the bridge result directly
            return bridgeResult
        } catch (err) {
            app.log.error(`MCP flow tool ${flowTool.name} error: ${err.message}`)
            return {
                content: [{ type: 'text', text: JSON.stringify({ error: err.message }) }],
                isError: true
            }
        }
    }

    /**
     * GET / — not supported for stateless MCP; return 405
     */
    app.get('/', { schema: { hide: true } }, async (request, reply) => {
        reply.code(405).send({ error: 'Method not allowed. Use POST for MCP requests.' })
    })

    /**
     * DELETE / — not supported for stateless MCP; return 405
     */
    app.delete('/', { schema: { hide: true } }, async (request, reply) => {
        reply.code(405).send({ error: 'Method not allowed. Use POST for MCP requests.' })
    })
}
