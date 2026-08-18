const PRESENCE_CACHE_NAME = 'mcpBrowserSessions'
const PRESENCE_CACHE_TTL = 135_000 // ~3x the 45s heartbeat interval
const CACHE_MAX = 10_000

const ACTIVE_SESSION_CACHE_NAME = 'mcpActiveBrowserSession'
const ACTIVE_SESSION_CACHE_TTL = 30 * 60 * 1000 // 30 minutes - a UI targeting preference, not tab liveness data

class BrowserSessionPresenceHandler {
    constructor (app, client) {
        this.app = app
        this.client = client
        this.presenceCache = app.caches.createCache(PRESENCE_CACHE_NAME, { max: CACHE_MAX, ttl: PRESENCE_CACHE_TTL })
        this.activeCache = app.caches.createCache(ACTIVE_SESSION_CACHE_NAME, { max: CACHE_MAX, ttl: ACTIVE_SESSION_CACHE_TTL })
        this.setupEventHandlers()
    }

    setupEventHandlers () {
        this.client.on('tab-presence', (msg) => this.handlePresence(msg))
    }

    async handlePresence ({ userId, sessionId, messageType, payload }) {
        const cacheKey = `${userId}:${sessionId}`
        console.log(`Received tab-presence message: userId=${userId}, sessionId=${sessionId}, messageType=${messageType}, payload=${JSON.stringify(payload)}`)
        if (messageType === 'heartbeat') {
            const existing = await this.presenceCache.get(cacheKey) || {}
            await this.presenceCache.set(cacheKey, {
                ...existing,
                userId,
                sessionId,
                lastSeen: Date.now(),
                visibility: payload.visibility || 'visible'
            })
        } else if (messageType === 'context') {
            const existing = await this.presenceCache.get(cacheKey) || {}
            await this.presenceCache.set(cacheKey, {
                ...existing,
                userId,
                sessionId,
                lastSeen: Date.now(),
                context: payload
            })
        }
    }

    async getSessionsByUser (userId) {
        const allEntries = await this.presenceCache.all()
        const prefix = `${userId}:`
        const sessions = []
        for (const [key, value] of Object.entries(allEntries)) {
            if (key.startsWith(prefix)) {
                sessions.push(value)
            }
        }
        return sessions
    }

    async getActiveBrowserSession (userId, mcpSessionId) {
        const activeKey = `${userId}:${mcpSessionId}`
        const sessionId = await this.activeCache.get(activeKey)
        console.info(`getActiveBrowserSession: activeKey=${activeKey} -> sessionId=${sessionId || 'none'}`)
        if (!sessionId) {
            return null
        }
        const presenceKey = `${userId}:${sessionId}`
        const session = await this.presenceCache.get(presenceKey)
        console.info(`getActiveBrowserSession: presenceKey=${presenceKey} -> ${session ? 'found' : 'NOT FOUND (stale pin)'}`)
        return session || null
    }

    async setActiveBrowserSession (userId, mcpSessionId, sessionId) {
        const activeKey = `${userId}:${mcpSessionId}`
        console.info(`setActiveBrowserSession: activeKey=${activeKey} -> sessionId=${sessionId}`)
        await this.activeCache.set(activeKey, sessionId)
    }
}

module.exports = {
    BrowserSessionPresenceHandler: (app, client) => new BrowserSessionPresenceHandler(app, client)
}
