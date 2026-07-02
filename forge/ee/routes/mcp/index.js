/**
 * MCP routes
 *
 * - registrations: NR instance/device MCP server registration and discovery
 * - server: Platform MCP server endpoint for external AI agents
 *
 * @param {import('../../../forge').ForgeApplication} app
 */
module.exports = async function (app) {
    await app.register(require('./registrations'), { prefix: '/api/v1/teams/:teamId/mcp', logLevel: app.config.logging.http })
    await app.register(require('./server'), { prefix: '/api/v1/mcp', logLevel: app.config.logging.http })
}
