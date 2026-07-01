/**
 * MCP Platform Tools Server
 *
 * Groundwork for exposing FlowFuse platform capabilities to third-party MCP
 * agents via Streamable HTTP. These endpoints will be enabled in a future
 * release once the tool definitions are stable and scoped PATs are in place.
 *
 * For now, the tool definitions in ee/lib/mcp/tools/ are consumed internally
 * by the first-party FlowFuse agent over MQTT.
 *
 * @param {import('../../../forge').ForgeApplication} app
 */
module.exports = async function (app) {
    // POST will serve the MCP Streamable HTTP protocol once third-party agent support is enabled
    app.post('/', async (request, reply) => {
        reply.code(405).send({ code: 'method_not_allowed', error: 'MCP HTTP endpoints are not available.' })
    })

    // GET and DELETE reserved for future session management (stateful MCP transport)
    app.get('/', async (request, reply) => {
        reply.code(405).send({ code: 'method_not_allowed', error: 'MCP HTTP endpoints are not available.' })
    })

    app.delete('/', async (request, reply) => {
        reply.code(405).send({ code: 'method_not_allowed', error: 'MCP HTTP endpoints are not available.' })
    })
}
