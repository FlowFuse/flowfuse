/**
 * MCP Platform Tools Server
 *
 * Exposes FlowFuse platform management capabilities as MCP tools.
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

    // POST handler will be implemented in #7429
    app.post('/', async (request, reply) => {
        reply.code(501).send({ code: 'not_implemented', error: 'MCP endpoint not yet implemented' })
    })

    // GET and DELETE are not supported in stateless mode
    app.get('/', async (request, reply) => {
        reply.code(405).send({ code: 'method_not_allowed', error: 'Method Not Allowed. Use POST for MCP requests.' })
    })

    app.delete('/', async (request, reply) => {
        reply.code(405).send({ code: 'method_not_allowed', error: 'Method Not Allowed. Stateless mode, no sessions to terminate.' })
    })
}
