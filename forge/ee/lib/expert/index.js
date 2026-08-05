const fp = require('fastify-plugin')

const { generateToken } = require('../../../db/utils')
// decorate the app with the expert helpers and cache utilities

const TOKEN_CACHE_NAME = 'ExpertMCPAccessTokenCache'

const EXPERT_MCP_SCOPE = 'ff-expert:mcp'
const EXPERT_MCP_PLATFORM_SCOPE = 'ff-expert:platform'
// Dedicated owner type so platform-automation tokens are not treated as general user tokens
const EXPERT_MCP_PLATFORM_OWNER_TYPE = 'user:expert-mcp'
// A named token is required for the request pipeline to treat a token as a
// scoped token and apply its readOnly and team-scope caps
const EXPERT_MCP_PLATFORM_TOKEN_NAME = 'FlowFuse Expert MCP Platform Token'

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

    // Log the Expert chat transport at startup. With the team broker enabled chat uses
    // the MQTT bridge (needs expert.centralBroker.server); otherwise it uses the HTTP url.
    if (serviceEnabled) {
        const teamBrokerEnabled = app.config.broker?.teamBroker?.enabled === true
        if (expertBridgeEnabled) {
            const ssl = app.config.expert?.centralBroker?.ssl ?? true
            app.log.info(`Expert enabled: chat via MQTT bridge to ${app.config.expert.centralBroker.server} (ssl=${ssl})`)
        } else if (teamBrokerEnabled) {
            app.log.warn('Expert enabled with the team broker on, but expert.centralBroker.server is not set: MQTT chat has no bridge and will not receive responses. Set expert.centralBroker.server (host:port).')
        } else {
            app.log.info(`Expert enabled: chat via HTTP service url ${expertUrl}`)
        }
    }

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

    // Mint a platform-automation token that is capped to a caller-provided
    // scope. The token carries a name so the request pipeline treats it as a
    // scoped token and enforces its readOnly flag and team scopes, ensuring an
    // injected request cannot exceed the caller's scope.
    async function mintCappedMcpPlatformToken (user, expiresAt, { readOnly, teams }) {
        const userId = typeof user === 'number' ? user : user.id
        const token = generateToken(32, 'ffu')
        await app.db.sequelize.transaction(async (t) => {
            const accessToken = await app.db.models.AccessToken.create({
                name: EXPERT_MCP_PLATFORM_TOKEN_NAME,
                token,
                scope: [EXPERT_MCP_PLATFORM_SCOPE],
                expiresAt,
                readOnly,
                ownerId: '' + userId,
                ownerType: EXPERT_MCP_PLATFORM_OWNER_TYPE
            }, { transaction: t })
            if (teams.length > 0) {
                const teamScopes = teams.map(teamId => ({
                    AccessTokenId: accessToken.id,
                    TeamId: app.db.models.Team.decodeHashid(teamId),
                    UserId: userId
                }))
                await app.db.models.AccessTokenTeamScope.bulkCreate(teamScopes, { transaction: t })
            }
        })
        return token
    }

    async function getOrCreateMcpPlatformToken (user, scope) {
        const capped = !!scope
        const readOnly = capped && scope.readOnly === true
        const teams = (capped && Array.isArray(scope.teams)) ? scope.teams : []

        let cacheKey = `platform:${user.hashid}`
        if (capped) {
            const teamsKey = [...teams].sort().join('|')
            cacheKey = `platform:${user.hashid}:readOnly=${readOnly}:teams=${teamsKey}`
        }

        const cached = await readCachedMcpAccessToken(cacheKey)
        if (cached) {
            return cached
        }

        const expiresAt = new Date(Date.now() + TOKEN_TTL)
        let entry
        if (capped) {
            const token = await mintCappedMcpPlatformToken(user, expiresAt, { readOnly, teams })
            entry = { token }
        } else {
            const { token } = await app.db.controllers.AccessToken.createTokenForUser(
                user,
                expiresAt,
                [EXPERT_MCP_PLATFORM_SCOPE],
                undefined,
                EXPERT_MCP_PLATFORM_OWNER_TYPE
            )
            entry = { token }
        }

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
