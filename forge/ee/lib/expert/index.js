const fp = require('fastify-plugin')
// decorate the app with the expert helpers and cache utilities

const TOKEN_CACHE_NAME = 'ExpertMCPAccessTokenCache'

module.exports = fp(async function (app, _opts) {
    // Get the assistant service configuration
    const serviceEnabled = app.config.expert?.enabled === true
    const expertUrl = app.config.expert?.service?.url
    const serviceToken = app.config.expert?.service?.token
    const requestTimeout = app.config.expert?.service?.requestTimeout || 60000

    const TOKEN_TTL = app.config.expert?.tokenCache?.ttl || 5 * 60 * 1000 // Default 5 minutes
    const TOKEN_REMAINING_LIMIT = 15000 // token life edge window (avoid using tokens about to expire)

    app.caches.createCache(TOKEN_CACHE_NAME, {
        max: app.config.expert?.tokenCache?.max || 1000,
        ttl: TOKEN_TTL,
        updateAgeOnGet: false // do not update the age on get, we want it to expire after the original ttl
    })

    function tokenCache () {
        return app.caches.getCache(TOKEN_CACHE_NAME)
    }

    async function clearMcpAccessTokenCache (cacheKey) {
        const cache = tokenCache()
        if (cacheKey) {
            await cache.del(cacheKey)
        } else {
            for (const key of await cache.keys()) {
                await cache.del(key)
            }
        }
    }

    // The cache abstraction has no getRemainingTTL, so we store expiresAt
    // alongside the token and check it ourselves to honour the edge window.
    async function readCachedMcpAccessToken (instanceId) {
        const entry = await tokenCache().get(instanceId)
        if (entry && entry.expiresAt - Date.now() > TOKEN_REMAINING_LIMIT) {
            return entry.value
        }
        return null
    }

    async function getOrCreateMcpAccessToken (instance, instanceType, instanceId, teamHttpSecurityFeatureEnabled) {
        let mcpAccessToken = await readCachedMcpAccessToken(instanceId)

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
            await tokenCache().set(instanceId, {
                value: mcpAccessToken,
                expiresAt: Date.now() + TOKEN_TTL
            })
        }
        return mcpAccessToken
    }

    async function getCachedMcpAccessToken (instanceId) {
        return readCachedMcpAccessToken(instanceId)
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
