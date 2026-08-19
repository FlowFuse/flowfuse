const CACHE_NAME = 'browserSessions'
const CACHE_TTL = 135_000 // ~3x the 45s heartbeat interval
const CACHE_MAX = 10_000

class BrowserSessionPresenceHandler {
    constructor (app, client) {
        this.app = app
        this.client = client
        this.cache = app.caches.createCache(CACHE_NAME, { max: CACHE_MAX, ttl: CACHE_TTL })
        this.setupEventHandlers()
    }

    setupEventHandlers () {
        this.client.on('tab-presence', (msg) => this.handlePresence(msg))
    }

    async handlePresence ({ userId, sessionId, messageType, payload }) {
        const cacheKey = `${userId}:${sessionId}`

        if (messageType === 'heartbeat') {
            const existing = await this.cache.get(cacheKey) || {}
            await this.cache.set(cacheKey, {
                ...existing,
                userId,
                sessionId,
                lastSeen: Date.now(),
                visibility: payload.visibility || 'visible'
            })
        } else if (messageType === 'context') {
            const existing = await this.cache.get(cacheKey) || {}
            await this.cache.set(cacheKey, {
                ...existing,
                userId,
                sessionId,
                lastSeen: Date.now(),
                context: payload
            })
        }
    }

    async getSessionsByUser (userId) {
        const allEntries = await this.cache.all()
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

module.exports = {
    BrowserSessionPresenceHandler: (app, client) => new BrowserSessionPresenceHandler(app, client)
}
