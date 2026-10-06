module.exports = async function (app) {
    // RFC 8414: OAuth 2.0 Authorization Server Metadata
    app.get('/oauth-authorization-server', {
        config: { allowAnonymous: true },
        schema: {
            tags: ['Authentication', 'X-HIDDEN'],
            response: {
                200: {
                    type: 'object',
                    properties: {
                        issuer: { type: 'string' },
                        authorization_endpoint: { type: 'string' },
                        token_endpoint: { type: 'string' },
                        response_types_supported: { type: 'array', items: { type: 'string' } },
                        grant_types_supported: { type: 'array', items: { type: 'string' } },
                        code_challenge_methods_supported: { type: 'array', items: { type: 'string' } },
                        token_endpoint_auth_methods_supported: { type: 'array', items: { type: 'string' } },
                        registration_endpoint: { type: 'string' }
                    }
                }
            }
        }
    }, async (request, reply) => {
        const baseUrl = app.config.base_url
        reply.send({
            issuer: baseUrl,
            authorization_endpoint: `${baseUrl}/account/authorize`,
            token_endpoint: `${baseUrl}/account/token`,
            response_types_supported: ['code'],
            grant_types_supported: ['authorization_code', 'refresh_token'],
            code_challenge_methods_supported: ['S256'],
            token_endpoint_auth_methods_supported: ['none'],
            registration_endpoint: `${baseUrl}/account/client`
        })
    })
}
