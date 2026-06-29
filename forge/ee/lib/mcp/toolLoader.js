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
 * @param {import('@modelcontextprotocol/sdk/server/mcp.js').McpServer} server
 * @param {Array} toolDefinitions - loaded tool definitions
 * @param {Function} inject - app.inject helper bound to the request's auth token
 * @param {Function} checkScope - scope check function (stub for now)
 */
function registerTools (server, toolDefinitions, inject, checkScope) {
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
            const response = await tool.handler(args, { inject })
            return formatResponse(response)
        })
    }
}

/**
 * Formats an app.inject() response into an MCP CallToolResult.
 */
function formatResponse (response) {
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
