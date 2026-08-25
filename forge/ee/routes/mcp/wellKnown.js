module.exports = async function (app) {
    // RFC 9728: OAuth 2.0 Protected Resource Metadata for the /mcp resource.
    // Lives in the EE mcp plugin so it is only advertised where /mcp exists.
    function protectedResourceMetadata () {
        const baseUrl = app.config.base_url
        return {
            resource: `${baseUrl}/mcp`,
            authorization_servers: [baseUrl]
        }
    }

    const schema = {
        tags: ['Authentication', 'X-HIDDEN'],
        response: {
            200: {
                type: 'object',
                properties: {
                    resource: { type: 'string' },
                    authorization_servers: { type: 'array', items: { type: 'string' } }
                }
            }
        }
    }

    // RFC 9728 §3.1: clients derive the metadata URL by inserting the resource
    // path, so the /mcp resource is served at oauth-protected-resource/mcp. The
    // bare path is kept as an alias for clients that omit path insertion.
    app.get('/oauth-protected-resource/mcp', { config: { allowAnonymous: true }, schema }, async (request, reply) => {
        reply.send(protectedResourceMetadata())
    })
    app.get('/oauth-protected-resource', { config: { allowAnonymous: true }, schema }, async (request, reply) => {
        reply.send(protectedResourceMetadata())
    })
}
