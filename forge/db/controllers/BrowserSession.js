/**
 * Browser session presence.
 *
 * Tracks which browser tabs a user currently has open and what each one is
 * looking at, so third-party agents can pick one to target. Entries are
 * ephemeral - they are refreshed by a heartbeat from the tab and expire on
 * their own if one stops arriving.
 *
 * This owns the cache only. Deciding which broker events feed it lives in
 * forge/comms/browserSessionLifecycle.js.
 */
const browserSessionCache = 'browserSessions'
const BROWSER_SESSION_CACHE_TTL = 1_800_000 // 30 minutes
const BROWSER_SESSION_CACHE_MAX = 10_000

const activeBrowserSessionCache = 'browserSessions-active'
const ACTIVE_BROWSER_SESSION_CACHE_TTL = 1_800_000
const ACTIVE_BROWSER_SESSION_CACHE_MAX = 10_000

module.exports = {
    init (app) {
        app.caches.createCache(browserSessionCache, { max: BROWSER_SESSION_CACHE_MAX, ttl: BROWSER_SESSION_CACHE_TTL })
        app.caches.createCache(activeBrowserSessionCache, { max: ACTIVE_BROWSER_SESSION_CACHE_MAX, ttl: ACTIVE_BROWSER_SESSION_CACHE_TTL })
    },

    /**
     * Every presence message carries the full tab snapshot, so the entry is
     * replaced rather than merged. That keeps concurrent messages for the same
     * session from overwriting each other's fields.
     */
    async recordPresence (app, userId, sessionId, payload = {}) {
        const cache = app.caches.getCache(browserSessionCache)
        await cache.set(`${userId}:${sessionId}`, {
            userId,
            sessionId,
            lastSeen: Date.now(),
            visibility: payload.visibility || 'visible',
            focused: payload.focused ?? null,
            // Tool groups this tab can answer for, so a consumer can pick a tab by the group it
            // needs to dispatch without reinterpreting the context's supports* flags.
            capabilities: Array.isArray(payload.capabilities) ? payload.capabilities : [],
            context: payload.context ?? null
        })
    },

    async removeSession (app, userId, sessionId) {
        const cache = app.caches.getCache(browserSessionCache)
        await cache.del(`${userId}:${sessionId}`)
    },

    async getSessionsByUser (app, userId) {
        const cache = app.caches.getCache(browserSessionCache)
        const allEntries = await cache.all()
        const prefix = `${userId}:`
        const sessions = []
        for (const [key, value] of Object.entries(allEntries)) {
            if (key.startsWith(prefix)) {
                sessions.push(value)
            }
        }
        return sessions
    },

    async setActiveBrowserSession (app, userId, mcpSessionId, sessionId) {
        const cache = app.caches.getCache(activeBrowserSessionCache)
        await cache.set(`${userId}:${mcpSessionId}`, sessionId)
    },

    async getActiveBrowserSession (app, userId, mcpSessionId) {
        const activeCache = app.caches.getCache(activeBrowserSessionCache)
        const sessionId = await activeCache.get(`${userId}:${mcpSessionId}`)
        if (!sessionId) {
            return null
        }
        const cache = app.caches.getCache(browserSessionCache)
        const session = await cache.get(`${userId}:${sessionId}`)
        return session || null
    }
}
