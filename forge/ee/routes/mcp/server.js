const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js')
const { StreamableHTTPServerTransport } = require('@modelcontextprotocol/sdk/server/streamableHttp.js')

const { loadToolDefinitions, registerTools } = require('../../lib/mcp/toolLoader')

// Load tool definitions once at startup
const toolDefinitions = loadToolDefinitions()

/**
 * MCP Platform Tools Server
 *
 * Exposes FlowFuse platform management capabilities as MCP tools.
 * Stateless Streamable HTTP: each POST creates a fresh McpServer and transport.
 * Auth via Bearer token (PAT), forwarded through app.inject() to existing routes.
 *
 * @param {import('../../../forge').ForgeApplication} app
 */
module.exports = async function (app) {
    app.addHook('preHandler', async (request, reply) => {
        // Gate on feature flag
        if (!app.config.features.enabled('expertPlatformAutomation')) {
            reply.code(404).send({ code: 'not_found', error: 'Not Found' })
            return
        }
        // Require a user-owned PAT (not device/project/broker tokens)
        if (!request.session?.User) {
            reply.code(401).send({ code: 'unauthorized', error: 'unauthorized' })
        }
    })

    /**
     * POST / - MCP protocol endpoint (Streamable HTTP)
     *
     * Each request creates a fresh McpServer instance with a stateless transport.
     * The auth token is forwarded to all internal route calls via app.inject().
     */
    app.post('/', async (request, reply) => {
        const server = new McpServer(
            { name: 'FlowFuse Platform', version: '1.0.0' },
            { capabilities: { tools: {} } }
        )

        const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: undefined // stateless, no server-side sessions
        })

        // Bind inject to this request's auth token
        const inject = (opts) => {
            return app.inject({
                ...opts,
                headers: {
                    ...opts.headers,
                    authorization: request.headers.authorization
                }
            })
        }

        // Stub scope check: will enforce PAT scopes once scoped PATs (#7411) land.
        // When implemented, this will check tool.annotations against the PAT's
        // readOnly flag and team scope restrictions.
        const checkScope = (_tool) => {
            return null // no restriction for now
        }

        registerTools(server, toolDefinitions, inject, checkScope)

        await server.connect(transport)

        // Hand off response handling to the MCP transport.
        // reply.hijack() tells Fastify we're managing the response directly,
        // which means Fastify plugins (including CORS) won't set headers.
        // Set CORS headers manually on the raw response before hijacking.
        const origin = request.headers.origin
        if (origin) {
            reply.raw.setHeader('Access-Control-Allow-Origin', origin)
            reply.raw.setHeader('Access-Control-Allow-Credentials', 'true')
        }
        reply.hijack()

        // The MCP SDK's transport uses @hono/node-server internally, which sets
        // a drain timeout that calls socket.destroySoon(). Fastify's app.inject()
        // creates mock sockets that lack this method, so we polyfill it.
        const socket = request.raw.socket
        if (socket && !socket.destroySoon) {
            socket.destroySoon = () => socket.destroy?.()
        }

        await transport.handleRequest(request.raw, reply.raw, request.body)
        await server.close()
    })

    // GET and DELETE are not supported in stateless mode
    app.get('/', async (request, reply) => {
        reply.code(405).send({ code: 'method_not_allowed', error: 'Method Not Allowed. Use POST for MCP requests.' })
    })

    app.delete('/', async (request, reply) => {
        reply.code(405).send({ code: 'method_not_allowed', error: 'Method Not Allowed. Stateless mode, no sessions to terminate.' })
    })
}
