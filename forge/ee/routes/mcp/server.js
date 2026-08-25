const { randomUUID } = require('node:crypto')

// Maps an in-flight mcpSessionId to the registered client name of the third-party
// caller that opened it, so the comms layer can attribute audit entries to that
// client instead of the first-party Expert default. Read by forge/comms/platformAutomation.js.
const MCP_SESSION_SOURCE_CACHE = 'mcp-session-source'
const MCP_SESSION_SOURCE_CACHE_TTL = 1000 * 60 * 60 // 1 hour

/**
 * MCP Platform Tools Server
 *
 * The third-party front door for FlowFuse platform tools. An external MCP agent
 * connects here over Streamable HTTP with a scoped Personal Access Token. This
 * endpoint terminates the PAT, resolves the caller's identity and scope, and
 * proxies the MCP request to the central gateway over MQTT
 * (ff/v1/mcp/<platformId>/<userId>/<mcpSessionId>/request),
 * returning the gateway's response. The token itself never leaves this process.
 *
 * @param {import('../../../forge').ForgeApplication} app
 */
module.exports = async function (app) {
    // Maps the invoke meta-tool name to its access variant, used by the read-only gate.
    function invokeVariant (mcpBody) {
        if (!mcpBody || mcpBody.method !== 'tools/call') {
            return null
        }
        const name = mcpBody.params?.name
        if (name === 'invoke_write_tool') {
            return 'write'
        }
        if (name === 'invoke_delete_tool') {
            return 'delete'
        }
        return 'read'
    }

    // Resolves the caller's identity and scope, or sends an error reply and returns null.
    async function resolveCaller (request, reply) {
        if (!request.session?.User) {
            // RFC 9728 §5.1: point unauthenticated callers at the resource metadata.
            reply.header('WWW-Authenticate', `Bearer resource_metadata="${app.config.base_url}/.well-known/oauth-protected-resource/mcp"`)
            reply.code(401).send({ code: 'unauthorized', error: 'Unauthorized' })
            return null
        }
        const pat = request.session.pat
        const readOnly = !!pat?.readOnly
        const teams = Array.isArray(pat?.teamScopes)
            ? pat.teamScopes.map(entry => Object.keys(entry)[0])
            : []
        // Gate the third-party MCP surface on the platform having AI enabled. An empty
        // allow-list is an all-teams PAT, so no single team is pinned here; per-team
        // access is enforced downstream by the scope-capped token at invoke.
        if (!app.config.features.enabled('ai')) {
            reply.code(404).send({ code: 'not_found', error: 'Not Found' })
            return null
        }
        return {
            userId: request.session.User.hashid,
            scope: { readOnly, teams },
            clientName: request.session.pat?.clientName || null
        }
    }

    // POST serves the MCP Streamable HTTP protocol in JSON mode: each request is
    // forwarded to the gateway and its response returned. Notifications (no id)
    // are acknowledged; the gateway populates its session on the first request.
    app.post('/', { config: { allowAnonymous: true } }, async (request, reply) => {
        const caller = await resolveCaller(request, reply)
        if (!caller) {
            return
        }
        const mcpBody = request.body
        if (!mcpBody || typeof mcpBody !== 'object') {
            reply.code(400).send({ code: 'invalid_request', error: 'Malformed MCP request body' })
            return
        }

        if (mcpBody.id === undefined) {
            reply.code(202).send()
            return
        }

        if (caller.scope.readOnly) {
            const variant = invokeVariant(mcpBody)
            if (variant === 'write' || variant === 'delete') {
                reply.code(403).send({ code: 'unauthorized', error: 'Personal Access Token is read-only' })
                return
            }
        }

        const mcpSessionId = request.headers['mcp-session-id'] || randomUUID()
        if (caller.clientName) {
            const cache = app.caches?.getCache?.(MCP_SESSION_SOURCE_CACHE, { ttl: MCP_SESSION_SOURCE_CACHE_TTL, max: 10000 })
            await cache?.set(mcpSessionId, { clientName: caller.clientName })
        }
        const route = {
            userId: caller.userId,
            mcpSessionId
        }
        const payload = {
            mcp: mcpBody,
            scope: caller.scope,
            toolGroups: ['platform', 'platform_ui', 'flow_building']
        }

        // Let the gateway know which browser tab (if any) this MCP connection has pinned as its
        // target, so platform_ui/flow_building tool calls don't need an explicit session id.
        let userProperties
        if (app.db.controllers.BrowserSession) {
            const activeBrowserSession = await app.db.controllers.BrowserSession.getActiveBrowserSession(caller.userId, mcpSessionId)
            request.log.info(`MCP ingress: userId=${caller.userId} mcpSessionId=${mcpSessionId} -> activeBrowserSession=${activeBrowserSession ? activeBrowserSession.sessionId : 'null'}`)
            if (activeBrowserSession) {
                userProperties = { activeBrowserSessionId: activeBrowserSession.sessionId }
                const topicParts = activeBrowserSession.context?.topicParts
                if (topicParts?.entityType) {
                    userProperties.entityType = topicParts.entityType
                }
                if (topicParts?.entityId) {
                    userProperties.entityId = topicParts.entityId
                }
            }
        }

        try {
            const mcpResponse = await app.comms.mcpGateway.proxyRequest(route, payload, undefined, userProperties)
            reply.header('mcp-session-id', mcpSessionId)
            reply.type('application/json').send(mcpResponse)
        } catch (err) {
            request.log.warn(`MCP gateway proxy failed: ${err.message}`)
            reply.code(504).send({ code: 'gateway_timeout', error: 'The MCP gateway did not respond' })
        }
    })

    // The gateway is the MCP server; this proxy does not hold a server-initiated
    // stream, so it does not offer the optional GET SSE channel.
    app.get('/', async (request, reply) => {
        reply.code(405).send({ code: 'method_not_allowed', error: 'MCP HTTP streaming is not available.' })
    })

    // Session teardown: nothing is held server-side in JSON mode, so acknowledge.
    app.delete('/', async (request, reply) => {
        reply.code(204).send()
    })
}
