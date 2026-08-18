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
        this.client.on('tab-presence', (msg) => {
            this.handlePresence(msg).catch((err) => {
                this.app.log.warn(`Failed to handle tab-presence message: ${err.toString()}`)
            })
        })
    }

    /**
     * Every presence message carries the full tab snapshot, so the cache entry is
     * replaced. That keeps concurrent messages for the same session from
     * overwriting each other's fields.
     */
    async handlePresence ({ userId, sessionId, messageType, payload }) {
        if (messageType !== 'heartbeat') {
            return
        }
        await this.cache.set(`${userId}:${sessionId}`, {
            userId,
            sessionId,
            lastSeen: Date.now(),
            visibility: payload.visibility || 'visible',
            focused: payload.focused ?? null,
            context: payload.context ?? null
        })
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
