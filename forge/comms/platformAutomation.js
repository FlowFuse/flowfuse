// /**
//  * This module provides the handler for platform automation events
//  */

const { default: z } = require('zod')

// Written by the third-party MCP door; a hit means a third-party caller, and the
// value is that caller's PAT. A miss is the first-party Expert path.
const MCP_SESSION_TOKEN_CACHE = 'mcp-session-token'

/**
 * Cheap, non-cryptographic fingerprint of the platform tool catalog, over each tool's
 * name/title/description/inputSchema/outputSchema/annotations/_meta. Sorted for stability
 * across enumeration order, so a caller can detect catalog changes before pulling the full list.
 *
 * @param {Array<{name:string,title?:string,description?:string,inputSchema?:object,outputSchema?:object,annotations?:object,_meta?:object}>} tools
 * @returns {string}
 */
function computeCatalogHash (tools) {
    const items = (tools || []).map(t => JSON.stringify({
        n: t.name,
        d: t.description || '',
        s: t.inputSchema || null,
        o: t.outputSchema || null,
        a: t.annotations || null,
        m: t._meta || null,
        t: t.title || null
    }))
    items.sort()
    const str = items.join('')
    let h = 5381
    for (let i = 0; i < str.length; i++) {
        h = (((h << 5) + h) ^ str.charCodeAt(i)) >>> 0
    }
    // Prefix with count + length to make incidental 32-bit collisions vanishingly unlikely.
    return `${items.length}-${str.length}-${h.toString(16)}`
}

/**
 * Fills in the defaults a tool's input schema declares.
 *
 * Handlers are invoked with the caller's arguments as-is, so a zod `.default()` on an
 * optional parameter would otherwise never apply and an omitted `limit` would fetch the
 * whole collection instead of one page. Parsing is deliberately lenient: on success the
 * declared defaults are filled in, and on failure the original input is passed through
 * untouched, so this can only ever add defaults and never newly reject a call the gateway
 * already accepted.
 *
 * @param {{inputSchema?: object}} tool
 * @param {object} input
 * @returns {object}
 */
function applyInputDefaults (tool, input) {
    if (!tool.inputSchema || Object.keys(tool.inputSchema).length === 0) {
        return input
    }
    const result = z.object(tool.inputSchema).safeParse(input)
    return result.success ? result.data : input
}

/**
 * PlatformAutomationHandler
 * @class PlatformAutomationHandler
 * @memberof forge.comms
 */
class PlatformAutomationHandler {
    /**
     * @param {import('../forge').ForgeApplication} app Fastify app
     * @param {import('./commsClient').CommsClient} client Comms Client
     */
    constructor (app, client) {
        this.app = app
        this.client = client

        /** Tool definitions without the handler functions - for sending across the wire to the agent for tool discovery */
        this._wireToolDefinitions = null
        this._fullToolDefinitions = null
        /** Deterministic fingerprint of the wire tool definitions - for cheap catalog change detection */
        this._catalogHash = null

        this.setupEventHandler()
    }

    /**
     * Lazily loads and caches the full tool definitions (with handlers)
     * from the EE MCP module.
     */
    loadTools () {
        if (!this._fullToolDefinitions) {
            const { loadToolDefinitions } = require('../ee/lib/mcp/toolLoader')
            this._fullToolDefinitions = loadToolDefinitions()
            this._wireToolDefinitions = this._fullToolDefinitions.map(({ name, title, description, inputSchema, outputSchema, annotations, _meta }) => ({
                name,
                title,
                description,
                inputSchema: inputSchema && z.toJSONSchema(z.object(inputSchema)),
                outputSchema: outputSchema && z.toJSONSchema(z.object(outputSchema)),
                annotations,
                _meta
            }))
            this._catalogHash = computeCatalogHash(this._wireToolDefinitions)
        }
    }

    /**
     * Returns wire-safe tool definitions (no handler functions).
     */
    getToolDefinitions () {
        this.loadTools()
        return this._wireToolDefinitions
    }

    /**
     * Returns a deterministic fingerprint of the wire tool definitions.
     */
    getCatalogHash () {
        this.loadTools()
        return this._catalogHash
    }

    /**
     * Finds a tool definition by name (including its handler).
     */
    findTool (toolName) {
        this.loadTools()
        return this._fullToolDefinitions.find(t => t.name === toolName)
    }

    setupEventHandler () {
        this.client.on('request/platform-automation:forge', this.eventHandler)
    }

    eventHandler = async ({ userId, mcpSessionId, command, data, meta, scope } = {}, onSuccess, onError) => {
        try {
            let result = {}
            this.app.log.info(`platform-automation request: userId=${userId} mcpSessionId=${mcpSessionId} command=${command} tool=${data?.name || 'n/a'}`)

            const sessionTokenCache = this.app.caches?.getCache?.(MCP_SESSION_TOKEN_CACHE)
            const sessionToken = mcpSessionId ? await sessionTokenCache?.get(mcpSessionId) : null
            const source = sessionToken ? 'mcp' : 'mcp:expert'

            switch (command) {
            case 'mcp-get-features':
                if (data?.hashOnly) {
                    // Cheap catalog change detection: return just the fingerprint so
                    // the caller can decide whether it needs to pull the full list.
                    result = { catalogHash: this.getCatalogHash() }
                } else {
                    result = { tools: this.getToolDefinitions(), catalogHash: this.getCatalogHash() }
                }
                break
            case 'mcp-call-tool': {
                const toolName = data?.name

                // The caller scope (readOnly plus any team restriction from the
                // session token) rides with the request so tools can report and
                // enforce what the session is allowed to do. Prefer the top-level
                // value, falling back to meta for callers that attach it there.
                const callerScope = scope ?? meta?.scope

                // TODO: Probably sensible to verify that toolDefinition matches the tool to ensure no tampering has occurred
                const { toolDefinition } = meta || {}

                // Resolve the tool before touching the caller-supplied definition: reading
                // annotations off an unknown tool throws a TypeError, which would surface as a
                // generic request error instead of the specific not-found code below.
                const tool = this.findTool(toolName)
                if (!tool) {
                    return onError(
                        `Unknown platform tool: ${toolName}`,
                        'MCP_PLATFORM_TOOL_NOT_FOUND'
                    )
                }

                // Verify tool annotations haven't been tampered with
                const { annotations } = toolDefinition || {}
                if (JSON.stringify({ annotations }) !== JSON.stringify({ annotations: tool.annotations })) {
                    return onError(
                        'Tool definition mismatch',
                        'MCP_PLATFORM_TOOL_TAMPERED'
                    )
                }

                const user = await this.app.db.models.User.byId(userId)
                if (!user) {
                    // Without this, result stays {} and onSuccess fires - the caller sees a
                    // successful call that silently did nothing.
                    return onError(
                        `No user found for userId: ${userId}`,
                        'MCP_PLATFORM_USER_NOT_FOUND'
                    )
                }
                // Third-party runs under the caller's PAT; Expert mints a token.
                const token = sessionToken || (await this.app.expert.mcp.getOrCreatePlatformToken(user)).token
                const inject = (opts) => {
                    const nonce = this.app.nonceStore.createSourceNonce({ source, toolName })
                    return this.app.inject({
                        ...opts,
                        headers: {
                            ...opts.headers,
                            authorization: `Bearer ${token}`,
                            'x-ff-source-nonce': nonce
                        }
                    })
                }

                const { formatResponse } = require('../ee/lib/mcp/toolLoader')
                const args = applyInputDefaults(tool, data?.input || {})
                const response = await tool.handler(args, { inject, app: this.app, user, mcpSessionId, scope: callerScope })
                result = formatResponse(response)
                break
            }
            default:
                // unrecognized command
            }

            onSuccess(result)
        } catch (err) {
            return onError(
                `An error occurred performing a platform automation request: ${err.message}`,
                'MCP_PLATFORM_AUTOMATION_REQUEST_ERROR',
                err
            )
        }
    }
}

module.exports = {
    PlatformAutomationHandler: (app, client) => new PlatformAutomationHandler(app, client)
}
