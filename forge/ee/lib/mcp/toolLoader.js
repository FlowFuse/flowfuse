const fs = require('fs')
const path = require('path')

const toolsDir = path.join(__dirname, 'tools')

/**
 * Loads all tool definition files from the tools/ directory.
 * Each file should export an array of tool definitions with:
 *   { name, description, inputSchema, annotations, handler }
 *
 * Definitions are loaded once at startup and reused across requests.
 */
function loadToolDefinitions () {
    const files = fs.readdirSync(toolsDir).filter(f => f.endsWith('.js'))
    const allTools = []
    for (const file of files) {
        const tools = require(path.join(toolsDir, file))
        allTools.push(...tools)
    }
    return allTools
}

/**
 * Registers all tool definitions on a McpServer instance.
 * Called once per request since the server is stateless (fresh per request).
 *
 * @param {Object} server
 * @param {Array} toolDefinitions - loaded tool definitions
 * @param {Function} inject - app.inject helper bound to the request's auth token
 * @param {Function} checkScope - scope check function (stub for now)
 * @param {Object} [options] - optional extra context passed to tool handlers
 * @param {Object} [options.comms] - device comms handler for MQTT commands
 */
function registerTools (server, toolDefinitions, inject, checkScope, options = {}) {
    const { comms } = options
    for (const tool of toolDefinitions) {
        const config = {
            description: tool.description,
            annotations: tool.annotations
        }
        if (tool.inputSchema && Object.keys(tool.inputSchema).length > 0) {
            config.inputSchema = tool.inputSchema
        }

        server.registerTool(tool.name, config, async (args) => {
            const scopeError = checkScope(tool)
            if (scopeError) {
                return scopeError
            }
            const response = await tool.handler(args, { inject, comms })
            return typeof response?.json === 'function' ? formatResponse(response) : response
        })
    }
}

/**
 * Formats an app.inject() response into an MCP CallToolResult.
 */
function formatResponse (response) {
    if (typeof response.json !== 'function') {
        return response
    }

    const body = response.json()
    if (response.statusCode >= 400) {
        return {
            content: body,
            code: response.statusCode,
            isError: true
        }
    }
    return body
}

module.exports = { formatResponse, loadToolDefinitions, registerTools }
