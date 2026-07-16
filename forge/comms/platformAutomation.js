// /**
//  * This module provides the handler for platform automation events
//  */

const { default: z } = require('zod')

/**
 * Cheap, non-cryptographic fingerprint of the platform tool catalog, over each tool's
 * name/title/description/inputSchema/annotations/_meta. Sorted for stability across
 * enumeration order, so a caller can detect catalog changes before pulling the full list.
 *
 * @param {Array<object>} tools
 * @returns {string}
 */
function computeCatalogHash (tools) {
    const items = (tools || []).map(t => JSON.stringify({
        n: t.name,
        d: t.description || '',
        s: t.inputSchema || null,
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
            this._wireToolDefinitions = this._fullToolDefinitions.map(({ name, title, description, inputSchema, annotations, _meta }) => ({
                name,
                title,
                description,
                inputSchema: inputSchema && z.toJSONSchema(z.object(inputSchema)),
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

    eventHandler = async ({ userId, command, data, meta } = {}, onSuccess, onError) => {
        try {
            let result = {}

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
                const args = data?.input || {}

                // TODO: Probably sensible to verify that toolDefinition matches the tool to ensure no tampering has occurred
                const { toolDefinition } = meta || {}

                const { annotations } = toolDefinition
                const tool = this.findTool(toolName)

                // Verify tool annotations haven't been tampered with
                if (JSON.stringify({ annotations }) !== JSON.stringify({ annotations: tool.annotations })) {
                    return onError(
                        'Tool definition mismatch',
                        'MCP_PLATFORM_TOOL_TAMPERED'
                    )
                }

                if (!tool) {
                    return onError(
                        `Unknown platform tool: ${toolName}`,
                        'MCP_PLATFORM_TOOL_NOT_FOUND'
                    )
                }

                const user = await this.app.db.models.User.byId(userId)
                if (user) {
                    const { token } = await this.app.expert.mcp.getOrCreatePlatformToken(user)
                    const inject = (opts) => this.app.inject({
                        ...opts,
                        headers: {
                            ...opts.headers,
                            authorization: `Bearer ${token}`,
                            'x-ff-automation-source': 'expert'
                        }
                    })

                    const { formatResponse } = require('../ee/lib/mcp/toolLoader')
                    const response = await tool.handler(args, { inject })
                    result = formatResponse(response)
                }
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
