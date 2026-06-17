'use strict'

/**
 * Well-known endpoint for MCP server discovery.
 *
 * Exposes `GET /.well-known/mcp-configuration` so that MCP clients can
 * discover the FlowFuse MCP server URL and OAuth parameters automatically.
 *
 * This is registered at the root level (not behind EE gating) so that
 * discovery works regardless of license. The MCP server endpoint it points
 * to (`/api/v1/mcp`) is EE-only, so unauthenticated or unlicensed requests
 * will receive a 401/404 there.
 */
const fp = require('fastify-plugin')

module.exports = fp(async function (app) {
    const handler = async (request, reply) => {
        const baseUrl = app.config.base_url
        reply.send({
            name: 'FlowFuse',
            description: 'Manage FlowFuse instances, applications, and Node-RED flows via MCP',
            url: `${baseUrl}/api/v1/mcp`,
            auth: {
                type: 'oauth2',
                authorization_url: `${baseUrl}/account/authorize`,
                token_url: `${baseUrl}/account/token`,
                client_id: 'mcp-agent',
                scope: 'mcp:platform'
            }
        })
    }

    const routeOptions = {
        config: {
            allowAnonymous: true,
            rateLimit: false
        },
        schema: {
            tags: ['MCP', 'X-HIDDEN'],
            response: {
                200: {
                    type: 'object',
                    properties: {
                        name: { type: 'string' },
                        description: { type: 'string' },
                        url: { type: 'string' },
                        auth: {
                            type: 'object',
                            properties: {
                                type: { type: 'string' },
                                authorization_url: { type: 'string' },
                                token_url: { type: 'string' },
                                client_id: { type: 'string' },
                                scope: { type: 'string' }
                            }
                        }
                    }
                }
            }
        }
    }

    // Root-level discovery endpoint (spec compliance)
    app.get('/.well-known/mcp-configuration', routeOptions, handler)

    // Also available under the MCP prefix (convenience)
    app.get('/api/v1/mcp/.well-known/mcp-configuration', routeOptions, handler)

    // RFC 9728 Protected Resource Metadata — lets MCP clients discover the
    // authorization server for the MCP endpoint.
    const protectedResourceOptions = {
        config: { allowAnonymous: true, rateLimit: false },
        schema: { tags: ['MCP', 'X-HIDDEN'] }
    }
    app.get('/.well-known/oauth-protected-resource', protectedResourceOptions, async (request, reply) => {
        const baseUrl = app.config.base_url
        reply.send({
            resource: `${baseUrl}/api/v1/mcp`,
            authorization_servers: [baseUrl],
            scopes_supported: ['mcp:platform'],
            bearer_methods_supported: ['header']
        })
    })

    // RFC 8414 Authorization Server Metadata — provides authorization and
    // token endpoint URLs for OAuth 2.0 PKCE flows (used by Claude Code,
    // Claude Desktop, Cursor, etc.).
    const authServerOptions = {
        config: { allowAnonymous: true, rateLimit: false },
        schema: { tags: ['MCP', 'X-HIDDEN'] }
    }
    app.get('/.well-known/oauth-authorization-server', authServerOptions, async (request, reply) => {
        const baseUrl = app.config.base_url
        reply.send({
            issuer: baseUrl,
            authorization_endpoint: `${baseUrl}/account/authorize`,
            token_endpoint: `${baseUrl}/account/token`,
            response_types_supported: ['code'],
            grant_types_supported: ['authorization_code'],
            code_challenge_methods_supported: ['S256'],
            token_endpoint_auth_methods_supported: ['none'],
            scopes_supported: ['mcp:platform']
        })
    })
}, { name: 'app.routes.wellKnown' })
