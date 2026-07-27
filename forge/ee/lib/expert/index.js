const fp = require('fastify-plugin')
// decorate the app with the expert helpers and cache utilities

const TOKEN_CACHE_NAME = 'ExpertMCPAccessTokenCache'

const EXPERT_MCP_SCOPE = 'ff-expert:mcp'
const EXPERT_MCP_PLATFORM_SCOPE = 'ff-expert:platform'
// Dedicated owner type so platform-automation tokens are not treated as general user tokens
const EXPERT_MCP_PLATFORM_OWNER_TYPE = 'user:expert-mcp'

const EXPERT_MCP_SCOPES = [
    EXPERT_MCP_SCOPE,
    EXPERT_MCP_PLATFORM_SCOPE
]

module.exports = fp(async function (app, _opts) {
    // Get the assistant service configuration
    const serviceEnabled = app.config.expert?.enabled === true
    const expertUrl = app.config.expert?.service?.url
    const serviceToken = app.config.expert?.service?.token
    const requestTimeout = app.config.expert?.service?.requestTimeout || 60000
    const expertBridgeEnabled = typeof app.config.expert?.centralBroker?.server === 'string' && app.config.expert?.centralBroker?.server.length > 0

    const TOKEN_TTL = app.config.expert?.tokenCache?.ttl || 5 * 60 * 1000 // Default 5 minutes
    const TOKEN_REMAINING_LIMIT = 15000 // token life edge window (avoid using tokens about to expire)

    app.housekeeper.registerTask(require('./tasks/startup'))
    app.housekeeper.registerTask(require('./tasks/weekly'))

    // Register the Expert Agent bridge heartbeat task if the Expert Bridge is enabled.
    if (expertBridgeEnabled) {
        const startDelay = app.config.expert.centralBroker.heartbeat?.startDelay || 2 * 60 * 1000 // 2 minutes
        const schedule = app.config.expert.centralBroker.heartbeat?.schedule || '*/1 * * * *' // every minute
        const maxResponseTime = 10000
        try {
            const task = require('./tasks/heartbeat')({ schedule, startDelay, maxResponseTime })
            app.housekeeper.registerTask(task)
        } catch (error) {
            app.log.error(`Expert Agent heartbeat task not registered: ${error.message}`)
        }
    }

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
            let httpNodeAuth
            if (instanceType === 'instance') {
                const instanceSettings = await instance.getSetting('settings')
                httpNodeAuth = instanceSettings?.httpNodeAuth
            } else if (instanceType === 'device') {
                const deviceSettings = await instance.getSetting('security')
                httpNodeAuth = deviceSettings?.httpNodeAuth
            }
            const tokenName = 'FlowFuse Expert MCP Access Token'
            const scope = [EXPERT_MCP_SCOPE, instanceType]
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

    async function getOrCreateMcpPlatformToken (user) {
        const cacheKey = `platform:${user.hashid}`
        const cached = await readCachedMcpAccessToken(cacheKey)
        if (cached) {
            return cached
        }

        const expiresAt = new Date(Date.now() + TOKEN_TTL)
        const { token } = await app.db.controllers.AccessToken.createTokenForUser(
            user,
            expiresAt,
            [EXPERT_MCP_PLATFORM_SCOPE],
            undefined,
            EXPERT_MCP_PLATFORM_OWNER_TYPE
        )

        const entry = { token }
        await tokenCache().set(cacheKey, {
            value: entry,
            expiresAt: Date.now() + TOKEN_TTL
        })
        return entry
    }

    app.decorate('expert', {
        serviceEnabled,
        expertUrl,
        serviceToken,
        requestTimeout,
        mcp: {
            clearTokenCache: clearMcpAccessTokenCache,
            getCachedToken: getCachedMcpAccessToken,
            getOrCreateToken: getOrCreateMcpAccessToken,
            getOrCreatePlatformToken: getOrCreateMcpPlatformToken
        }
    })
}, { name: 'app.expert' })

module.exports.EXPERT_MCP_SCOPES = EXPERT_MCP_SCOPES
