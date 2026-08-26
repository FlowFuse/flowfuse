const { randomUUID } = require('node:crypto')

// Maps mcpSessionId to the third-party caller's PAT, consumed by the comms layer.
const MCP_SESSION_TOKEN_CACHE = 'mcp-session-token'
const MCP_SESSION_TOKEN_CACHE_TTL = 1000 * 60 * 60 // 1 hour

// Deny stand-in for when no team survives AI filtering. An empty team list means
// "all teams", so we substitute a value that matches no team rather than let a
// filtered-to-empty list read as all-teams.
const AI_DISABLED_SENTINEL = '__ff_no_ai_team__'

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

    // Narrows a token's team reach (teamScopes, empty means all-teams) to the teams
    // with AI enabled, substituting the deny sentinel when none survive.
    async function resolveAiTeams (user, teamScopes) {
        // Team-scoped token: keep only the named teams that have AI enabled.
        if (teamScopes.length > 0) {
            const enabled = []
            for (const teamHashId of teamScopes) {
                if (await app.db.controllers.Team.isTeamAiEnabled(teamHashId)) {
                    enabled.push(teamHashId)
                }
            }
            return enabled.length > 0 ? enabled : [AI_DISABLED_SENTINEL]
        }
        // All-teams token: filter the AI gate over the user's actual memberships.
        const memberTeams = await app.db.controllers.Team.getUserTeamHashIds(user)
        if (memberTeams.length === 0) {
            return [AI_DISABLED_SENTINEL]
        }
        const enabled = []
        for (const teamHashId of memberTeams) {
            if (await app.db.controllers.Team.isTeamAiEnabled(teamHashId)) {
                enabled.push(teamHashId)
            }
        }
        if (enabled.length === 0) {
            return [AI_DISABLED_SENTINEL]
        }
        // Keep an all-teams token unrestricted only when every team qualifies.
        if (enabled.length === memberTeams.length) {
            return []
        }
        return enabled
    }

    // Resolves the caller's identity and scope, or sends an error reply and returns null.
    async function resolveCaller (request, reply) {
        if (!request.session?.User) {
            // RFC 9728 §5.1: point unauthenticated callers at the resource metadata.
            reply.header('WWW-Authenticate', `Bearer resource_metadata="${app.config.base_url}/.well-known/oauth-protected-resource/mcp"`)
            reply.code(401).send({ code: 'unauthorized', error: 'Unauthorized' })
            return null
        }
        // Gate the third-party MCP surface on the platform having AI enabled.
        if (!app.config.features.enabled('ai')) {
            reply.code(404).send({ code: 'not_found', error: 'Not Found' })
            return null
        }
        const pat = request.session.pat
        const readOnly = !!pat?.readOnly
        const teamScopes = Array.isArray(pat?.teamScopes)
            ? pat.teamScopes.map(entry => Object.keys(entry)[0])
            : []
        const teams = await resolveAiTeams(request.session.User, teamScopes)
        return {
            userId: request.session.User.hashid,
            scope: { readOnly, teams }
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
        const authHeader = request.headers.authorization || ''
        const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null
        if (token) {
            const cache = app.caches?.getCache?.(MCP_SESSION_TOKEN_CACHE, { ttl: MCP_SESSION_TOKEN_CACHE_TTL, max: 10000 })
            await cache?.set(mcpSessionId, token)
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

        // Attribution the gateway can't derive from the topic, sent as MQTT user properties.
        // telemetryEnabled gates emission; patId is the PAT hashid so no raw token travels.
        const telemetryEnabled = app.license.active() || (app.config.telemetry.enabled !== false && app.settings.get('telemetry:enabled') !== false)
        const userProperties = {
            telemetryEnabled: telemetryEnabled ? 'true' : 'false'
        }
        // The PAT's owning user, used as the telemetry identity so 3rd-party usage attributes to
        // the same person the platform already identifies on the frontend.
        if (request.session.User?.username) {
            userProperties.username = request.session.User.username
        }
        userProperties.deployment = app.settings.get('telemetry:anonymize') === false ? 'cloud' : 'self-hosted'
        const patId = request.session.pat?.id
        if (patId !== undefined && patId !== null) {
            userProperties.patId = app.db.models.AccessToken.encodeHashid(patId)
        }

        // Let the gateway know which browser tab (if any) this MCP connection has pinned as its
        // target, so platform_ui/flow_building tool calls don't need an explicit session id.
        if (app.db.controllers.BrowserSession) {
            const activeBrowserSession = await app.db.controllers.BrowserSession.getActiveBrowserSession(caller.userId, mcpSessionId)
            request.log.info(`MCP ingress: userId=${caller.userId} mcpSessionId=${mcpSessionId} -> activeBrowserSession=${activeBrowserSession ? activeBrowserSession.sessionId : 'null'}`)
            if (activeBrowserSession) {
                userProperties.activeBrowserSessionId = activeBrowserSession.sessionId
                const context = activeBrowserSession.context
                const topicParts = context?.topicParts
                if (topicParts?.entityType) {
                    userProperties.entityType = topicParts.entityType
                }
                if (topicParts?.entityId) {
                    userProperties.entityId = topicParts.entityId
                }
                if (context?.teamId) {
                    userProperties.teamId = context.teamId
                }
            }
        }

        // A single-team PAT pins the action there when no tab named a team; multi-team tokens stay unattributed.
        if (!userProperties.teamId && caller.scope.teams.length === 1 && caller.scope.teams[0] !== AI_DISABLED_SENTINEL) {
            userProperties.teamId = caller.scope.teams[0]
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
