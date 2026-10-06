const fs = require('fs')
const path = require('path')

const toolsDir = path.join(__dirname, 'tools')

/**
 * Loads all tool definition files from the tools/ directory.
 * Each file should export an array of tool definitions with:
 *   { name, title, description, inputSchema, annotations, handler }
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

module.exports = { formatResponse, loadToolDefinitions }
