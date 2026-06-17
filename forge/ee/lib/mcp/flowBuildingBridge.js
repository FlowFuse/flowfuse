'use strict'

const { Client } = require('@modelcontextprotocol/sdk/client/index.js')
const { StreamableHTTPClientTransport } = require('@modelcontextprotocol/sdk/client/streamableHttp.js')
const { z } = require('zod')

/**
 * Convert a JSON Schema property to a Zod schema.
 * Handles the common types returned by the flow building MCP server.
 */
function tryParseJSON (val) {
    if (typeof val !== 'string') return val
    try { return JSON.parse(val) } catch (_) { return val }
}

function jsonSchemaPropertyToZod (prop) {
    if (!prop || typeof prop !== 'object') return z.any()

    switch (prop.type) {
    case 'string':
        if (prop.enum) return z.enum(prop.enum)
        return z.string()
    case 'number':
    case 'integer':
        return z.number()
    case 'boolean':
        return z.boolean()
    case 'array':
        // Preprocess: MCP clients may serialize arrays as JSON strings
        return z.preprocess(tryParseJSON,
            z.array(prop.items ? jsonSchemaPropertyToZod(prop.items) : z.any()))
    case 'object':
        if (prop.properties) {
            return z.preprocess(tryParseJSON, jsonSchemaToZod(prop))
        }
        return z.preprocess(tryParseJSON, z.record(z.any()))
    default:
        return z.any()
    }
}

/**
 * Convert a JSON Schema object to a Zod object schema.
 */
function jsonSchemaToZod (schema) {
    if (!schema || schema.type !== 'object') return z.object({}).passthrough()

    const shape = {}
    const props = schema.properties || {}
    const required = schema.required || []

    for (const [key, prop] of Object.entries(props)) {
        let field = jsonSchemaPropertyToZod(prop)
        if (prop.description) field = field.describe(prop.description)
        if (!required.includes(key)) field = field.optional()
        shape[key] = field
    }

    return schema.additionalProperties === false
        ? z.object(shape)
        : z.object(shape).passthrough()
}

class FlowBuildingBridge {
    constructor (app) {
        this.app = app
        this.cachedTools = null
        this.cacheExpiry = 0
        this.CACHE_TTL = 5 * 60 * 1000 // 5 minutes
    }

    get mcpUrl () {
        return this.app.config.expert?.flowBuildingMcpUrl
    }

    get isConfigured () {
        return !!this.mcpUrl
    }

    /**
     * Get the list of flow building tools from the MCP server.
     * Caches results for 5 minutes.
     * @returns {Promise<Array>} Array of tool definitions with `flow.` prefix
     */
    async getTools () {
        if (this.cachedTools && Date.now() < this.cacheExpiry) {
            return this.cachedTools
        }
        if (!this.isConfigured) return []

        try {
            const tools = await this._fetchTools()
            this.cachedTools = tools
            this.cacheExpiry = Date.now() + this.CACHE_TTL
            return tools
        } catch (err) {
            this.app.log.warn(`Failed to fetch flow building tools: ${err.message}`)
            // Return stale cache if available, otherwise empty
            return this.cachedTools || []
        }
    }

    /**
     * Call a tool on the flow building MCP server.
     * @param {string} toolName - The original tool name (without flow. prefix)
     * @param {object} args - Tool arguments
     * @returns {Promise<object>} Tool result
     */
    async callTool (toolName, args) {
        if (!this.isConfigured) {
            throw new Error('Flow building MCP server not configured')
        }

        const client = new Client({ name: 'flowfuse-forge', version: '1.0.0' })
        const transport = new StreamableHTTPClientTransport(new URL(this.mcpUrl))

        try {
            await client.connect(transport)
            const result = await client.callTool({ name: toolName, arguments: args })
            return result
        } finally {
            try { await client.close() } catch (_) {}
        }
    }

    async _fetchTools () {
        const client = new Client({ name: 'flowfuse-forge', version: '1.0.0' })
        const transport = new StreamableHTTPClientTransport(new URL(this.mcpUrl))

        try {
            await client.connect(transport)
            const { tools } = await client.listTools()

            // Wrap each tool with flow. prefix and bridge metadata
            return tools.map(tool => ({
                name: `flow.${tool.name}`,
                originalName: tool.name,
                description: tool.description || '',
                inputSchema: jsonSchemaToZod(tool.inputSchema),
                annotations: {
                    readOnlyHint: false,
                    destructiveHint: false,
                    idempotentHint: false,
                    openWorldHint: false
                },
                _bridge: true
            }))
        } finally {
            try { await client.close() } catch (_) {}
        }
    }

    /**
     * Invalidate the tool cache (e.g., when config changes)
     */
    invalidateCache () {
        this.cachedTools = null
        this.cacheExpiry = 0
    }
}

module.exports = { FlowBuildingBridge }
