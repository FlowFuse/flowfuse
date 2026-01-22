const fp = require('fastify-plugin')
const { LRUCache } = require('lru-cache')
// decorate the app with the expert helpers and cache utilities

module.exports = fp(async function (app, _opts) {
    // Get the assistant service configuration
    const serviceEnabled = app.config.expert?.enabled === true
    const expertUrl = app.config.expert?.service?.url
    const serviceToken = app.config.expert?.service?.token
    const requestTimeout = app.config.expert?.service?.requestTimeout || 60000

    const TOKEN_TTL = app.config.expert?.tokenCache?.ttl || 5 * 60 * 1000 // Default 5 minutes
    const TOKEN_REMAINING_LIMIT = 15000 // token life edge window (avoid using tokens about to expire)
    const mcpAccessTokenCache = new LRUCache({
        name: 'ExpertMCPAccessTokenCache', // for testing purposes
        max: app.config.expert?.tokenCache?.max || 1000,
        ttl: TOKEN_TTL,
        updateAgeOnGet: false // do not update the age on get, we want it to expire after the original ttl
    })

    function clearMcpAccessTokenCache (cacheKey) {
        if (cacheKey) {
            mcpAccessTokenCache.delete(cacheKey)
        } else {
            mcpAccessTokenCache.clear()
        }
    }

    async function getOrCreateMcpAccessToken (instance, instanceType, instanceId, teamHttpSecurityFeatureEnabled) {
        let mcpAccessToken
        if (mcpAccessTokenCache.has(instanceId)) {
            const remainingTTL = mcpAccessTokenCache.getRemainingTTL(instanceId)
            if (remainingTTL > TOKEN_REMAINING_LIMIT) { // only use cached token if it has more than 5 second remaining
                mcpAccessToken = mcpAccessTokenCache.get(instanceId)
            }
        }

        if (!mcpAccessToken) {
            const instanceSettings = await instance.getSetting('settings')
            const httpNodeAuth = instanceSettings?.httpNodeAuth
            const tokenName = 'FlowFuse Expert MCP Access Token'
            const scope = ['ff-expert:mcp', instanceType]
            if (httpNodeAuth?.type === 'flowforge-user' && teamHttpSecurityFeatureEnabled) {
                // FlowFuse auth is enabled for this instance
                const expiresAt = new Date(Date.now() + (TOKEN_TTL))
                const token = await app.db.controllers.AccessToken.createHTTPNodeToken(instance, tokenName, scope, expiresAt)
                mcpAccessToken = {
                    scheme: 'Bearer',
                    scope,
                    token: token.token
                }
            } else if (httpNodeAuth?.type === 'basic') {
                // Basic auth is enabled - MCP client will need to use basic auth
                mcpAccessToken = {
                    scheme: 'Basic',
                    scope,
                    token: '' // basic auth is not supported - we have no access to the password. For now, just return an empty string.
                }
            } else {
                // default - no auth
                mcpAccessToken = {
                    scheme: '',
                    scope,
                    token: null
                }
            }
            mcpAccessTokenCache.set(instanceId, mcpAccessToken)
        }
        return mcpAccessToken
    }

    function getCachedMcpAccessToken (instanceId) {
        if (mcpAccessTokenCache.has(instanceId)) {
            const remainingTTL = mcpAccessTokenCache.getRemainingTTL(instanceId)
            if (remainingTTL > 15000) { // only use cached token if it is not about to expire
                return mcpAccessTokenCache.get(instanceId)
            }
        }
        return null
    }

    app.decorate('expert', {
        serviceEnabled,
        expertUrl,
        serviceToken,
        requestTimeout,
        mcp: {
            clearTokenCache: clearMcpAccessTokenCache,
            getCachedToken: getCachedMcpAccessToken,
            getOrCreateToken: getOrCreateMcpAccessToken
        }
    })
}, { name: 'app.expert' })
