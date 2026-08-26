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
 *
 * Pins are not exclusive: several MCP clients can target the same tab at once. The
 * tab is told how many currently hold it (see notifyPinnedClients) so the user can
 * see, at a glance, what is driving the page in front of them. That count rides the
 * heartbeat rather than being event-driven, because a pin can also end by simply
 * expiring, and an expiry produces no event for anyone to publish.
 *
 * Scale note: heartbeats only arrive from tabs where the user enabled MCP
 * access, so the scan in refreshActivePins runs rarely and over a small hash.
 * If MCP access ever becomes enabled by default, every open tab will scan the
 * full hash every 60s (or whatever the freq is). Add a per-tab "has pins" marker
 * entry first, so tabs without pins skip the scan.
 */
const { escapeGlob } = require('../../caches/util')

const browserSessionCache = 'browserSessions'
const BROWSER_SESSION_CACHE_TTL = 1_800_000 // 30 minutes
const BROWSER_SESSION_CACHE_MAX = 10_000

const activeBrowserSessionCache = 'browserSessions-active'
const ACTIVE_BROWSER_SESSION_CACHE_TTL = 1_800_000
const ACTIVE_BROWSER_SESSION_CACHE_MAX = 10_000

/**
 * Refresh the TTLs of every pin referencing a browser session and return the
 * pinned MCP session ids. Both directions of each pin are touched so the pair
 * ages together (scan alone does not refresh).
 */
async function touchActiveBrowserSessions (app, userId, browserSessionId) {
    const activeCache = app.caches.getCache(activeBrowserSessionCache)
    const keys = await activeCache.scan(`browser-to-mcp::${escapeGlob(userId)}:${escapeGlob(browserSessionId)}:*`)
    const mcpSessionIds = []
    for (const key of keys) {
        const mcpSessionId = await activeCache.get(key)
        if (mcpSessionId) {
            await activeCache.get(`mcp-to-browser::${userId}:${mcpSessionId}`)
            mcpSessionIds.push(mcpSessionId)
        }
    }
    return mcpSessionIds
}

/**
 * Tell a tab how many MCP clients currently hold it.
 *
 * `teamId` is the tab's topic tree. Callers that already have it (the heartbeat)
 * pass it in; callers that do not (a pin made over MCP) leave it out and it is read
 * back off the snapshot. A tab whose snapshot predates teamId being recorded gets
 * no notification, and re-learns the count on its next heartbeat.
 */
async function notifyPinnedClients (app, userId, browserSessionId, mcpSessionIds, teamId = null) {
    if (!app.comms?.browserSession) {
        return
    }
    let team = teamId
    if (!team) {
        const cache = app.caches.getCache(browserSessionCache)
        const session = await cache.get(`${userId}:${browserSessionId}`)
        team = session?.teamId
    }
    if (!team) {
        return
    }
    app.comms.browserSession.notifyMcp(team, userId, browserSessionId, 'clients', {
        count: mcpSessionIds.length,
        sessionIds: mcpSessionIds
    })
}

module.exports = {
    init (app) {
        // Create a cache for browser session presence. Each entry is a tab snapshot, keyed by userId:sessionId.
        // updateAgeOnGet is off: only the tab's own heartbeat (recordPresence) keeps an entry alive
        app.caches.createCache(browserSessionCache, { max: BROWSER_SESSION_CACHE_MAX, ttl: BROWSER_SESSION_CACHE_TTL, updateAgeOnGet: false })
        // Create a cache for the active browser session per userId:mcpSessionId and the active mcpSessionId per userId:browserSessionId:mcpSessionId.
        // Each entry is a string, keyed by userId:mcpSessionId or userId:browserSessionId:mcpSessionId.
        // The first notes which browser session is currently active for a given MCP session
        // The second notes which MCP sessions are currently active for a given browser session by use of a wildcard scan.
        app.caches.createCache(activeBrowserSessionCache, { max: ACTIVE_BROWSER_SESSION_CACHE_MAX, ttl: ACTIVE_BROWSER_SESSION_CACHE_TTL, updateAgeOnGet: true })
    },

    /**
     * Every presence message carries the full tab snapshot, so the entry is
     * replaced rather than merged. That keeps concurrent messages for the same
     * session from overwriting each other's fields.
     */
    async recordPresence (app, userId, browserSessionId, payload = {}, teamId = null) {
        const cache = app.caches.getCache(browserSessionCache)
        await cache.set(`${userId}:${browserSessionId}`, {
            userId,
            sessionId: browserSessionId,
            // Which topic tree this tab lives under, so the platform can publish back to
            // it from a context that only knows the session id.
            teamId,
            lastSeen: Date.now(),
            visibility: payload.visibility || 'visible',
            focused: payload.focused ?? null,
            // Tool groups this tab can answer for, so a consumer can pick a tab by the group it
            // needs to dispatch without reinterpreting the context's supports* flags.
            capabilities: Array.isArray(payload.capabilities) ? payload.capabilities : [],
            context: payload.context ?? null
        })
        // the heartbeat is the liveness signal for this tab's pins too, and the pin set it
        // resolves is the same one the tab wants to know about, so it is answered here
        // rather than recomputed. This is also what makes an expired pin self-correcting.
        const mcpSessionIds = await touchActiveBrowserSessions(app, userId, browserSessionId)
        await notifyPinnedClients(app, userId, browserSessionId, mcpSessionIds, teamId)
    },

    async removeSession (app, userId, browserSessionId) {
        const cache = app.caches.getCache(browserSessionCache)
        await cache.del(`${userId}:${browserSessionId}`)
        // Drop any MCP pins referencing this browser session so it stops reporting as active
        const activeCache = app.caches.getCache(activeBrowserSessionCache)
        const keys = await activeCache.scan(`browser-to-mcp::${escapeGlob(userId)}:${escapeGlob(browserSessionId)}:*`)
        for (const key of keys) {
            const mcpSessionId = await activeCache.get(key)
            await activeCache.del(key)
            if (mcpSessionId) {
                // only clear the reverse entry if it still points at this browser session
                const pinned = await activeCache.get(`mcp-to-browser::${userId}:${mcpSessionId}`)
                if (pinned === browserSessionId) {
                    await activeCache.del(`mcp-to-browser::${userId}:${mcpSessionId}`)
                }
            }
        }
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

    async setActiveBrowserSession (app, userId, mcpSessionId, browserSessionId) {
        const cache = app.caches.getCache(activeBrowserSessionCache)
        // If the MCP session was pinned to a different browser session, drop the old reverse entry
        const previous = await cache.get(`mcp-to-browser::${userId}:${mcpSessionId}`)
        if (previous && previous !== browserSessionId) {
            await cache.del(`browser-to-mcp::${userId}:${previous}:${mcpSessionId}`)
        }
        await cache.set(`mcp-to-browser::${userId}:${mcpSessionId}`, browserSessionId) // userId:mcpSessionId → browserSessionId
        await cache.set(`browser-to-mcp::${userId}:${browserSessionId}:${mcpSessionId}`, mcpSessionId) // userId:browserSessionId:mcpSessionId → mcpSessionId

        // Tell the tab straight away rather than leaving it to notice on its next
        // heartbeat. A tab the pin moved away from is told too, so its count drops
        // at the same moment the new tab's rises.
        await notifyPinnedClients(app, userId, browserSessionId, await touchActiveBrowserSessions(app, userId, browserSessionId))
        if (previous && previous !== browserSessionId) {
            await notifyPinnedClients(app, userId, previous, await touchActiveBrowserSessions(app, userId, previous))
        }
    },

    async getActiveBrowserSession (app, userId, mcpSessionId) {
        const activeCache = app.caches.getCache(activeBrowserSessionCache)
        const browserSessionId = await activeCache.get(`mcp-to-browser::${userId}:${mcpSessionId}`)
        if (!browserSessionId) {
            return null
        }
        // touch the reverse entry so the pair's TTLs stay aligned (scan does not refresh)
        await activeCache.get(`browser-to-mcp::${userId}:${browserSessionId}:${mcpSessionId}`)
        const cache = app.caches.getCache(browserSessionCache)
        const session = await cache.get(`${userId}:${browserSessionId}`)
        return session || null
    },

    /**
     * MCP session ids currently pinned to a browser session. Returns an empty
     * array when there are none.
     */
    async getActiveMcpSessions (app, userId, browserSessionId) {
        return touchActiveBrowserSessions(app, userId, browserSessionId)
    }
}
