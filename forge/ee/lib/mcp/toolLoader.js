const fs = require('fs')
const path = require('path')

const { validateIdArgs, guardInject } = require('./utils')

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

/**
 * Runs a tool handler behind the shared path guard: rejects id arguments that are not a plain
 * path segment, and hands the handler an inject that refuses dot-segment paths. Every dispatch
 * of a tool must go through here so individual tools never have to remember the checks.
 */
async function invokeTool (tool, args, context) {
    const invalid = validateIdArgs(args)
    if (invalid) {
        return invalid
    }
    return tool.handler(args, { ...context, inject: guardInject(context.inject) })
}

module.exports = { formatResponse, loadToolDefinitions, invokeTool }
