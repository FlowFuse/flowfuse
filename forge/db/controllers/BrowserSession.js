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
const CACHE_TTL = 135_000 // ~3x the 45s heartbeat interval
const CACHE_MAX = 10_000

module.exports = {
    init (app) {
        app.caches.createCache(browserSessionCache, { max: CACHE_MAX, ttl: CACHE_TTL })
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
    }
}
