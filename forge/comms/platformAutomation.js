// /**
//  * This module provides the handler for platform automation events
//  */

const { default: z } = require('zod')

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
            this._wireToolDefinitions = this._fullToolDefinitions.map(({ name, description, inputSchema, annotations }) => ({
                name,
                description,
                inputSchema: inputSchema && z.toJSONSchema(z.object(inputSchema)),
                annotations
            }))
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
                result = { tools: this.getToolDefinitions() }
                break
            case 'mcp-call-tool': {
                const toolName = data?.name
                const args = data?.input || {}

                // TODO: Probably sensible to verify that toolDefinition matches the tool to ensure no tampering has occurred
                const { toolDefinition } = meta || {}

                const tool = this.findTool(toolName)
                if (!tool) {
                    return onError(
                        `Unknown platform tool: ${toolName}`,
                        'MCP_PLATFORM_TOOL_NOT_FOUND'
                    )
                }

                const user = await this.app.db.models.User.byId(userId)
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
