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
 * Pins are not exclusive: several MCP clients can target one tab, and the tab is told
 * how many hold it (notifyPinnedClients). That rides the heartbeat rather than events,
 * because a pin can end by simply expiring, and an expiry produces no event.
 *
 * Scale note: heartbeats only arrive from tabs where the user enabled MCP
 * access, so the scan in refreshActivePins runs rarely and over a small hash.
 * If MCP access ever becomes enabled by default, every open tab will scan the
 * full hash every 60s (or whatever the freq is). Add a per-tab "has pins" marker
 * entry first, so tabs without pins skip the scan.
 */
const crypto = require('crypto')

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
 * Opaque stand-in for an MCP session id. The tab needs to tell clients apart to report
 * arrivals and departures, but the id itself keys the PAT cache (forge/ee/routes/mcp/server.js)
 * and has no business in page memory.
 */
function clientRef (mcpSessionId) {
    return crypto.createHash('sha256').update(String(mcpSessionId)).digest('hex').slice(0, 12)
}

/**
 * Tell a tab which MCP clients hold it. `teamId` is its topic tree - passed in by the
 * heartbeat, read off the snapshot by callers that lack it (a pin made over MCP).
 *
 * Best effort: the pin is already written, so a failure here must not fail its caller.
 * A tab that misses this re-learns the count on its next heartbeat.
 */
async function notifyPinnedClients (app, userId, browserSessionId, mcpSessionIds, teamId = null) {
    try {
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
            clients: mcpSessionIds.map(clientRef)
        })
    } catch (err) {
        app.log?.warn(`Failed to notify browser session ${browserSessionId} of its MCP clients: ${err.toString()}`)
    }
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
            // The tab's topic tree, so the platform can publish back to it later
            teamId,
            lastSeen: Date.now(),
            visibility: payload.visibility || 'visible',
            focused: payload.focused ?? null,
            // Tool groups this tab can answer for, so a consumer can pick a tab by the group it
            // needs to dispatch without reinterpreting the context's supports* flags.
            capabilities: Array.isArray(payload.capabilities) ? payload.capabilities : [],
            context: payload.context ?? null
        })
        // The heartbeat keeps this tab's pins alive, and the set it resolves is the one the
        // tab wants told back to it - which is what makes an expired pin self-correcting.
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

        // Tell both tabs now rather than at their next heartbeat, so the old tab's count
        // drops as the new one's rises. Both pins are already written, so nothing here may
        // fail the call - an agent told its pin failed would retry one that succeeded.
        try {
            await notifyPinnedClients(app, userId, browserSessionId, await touchActiveBrowserSessions(app, userId, browserSessionId))
            if (previous && previous !== browserSessionId) {
                await notifyPinnedClients(app, userId, previous, await touchActiveBrowserSessions(app, userId, previous))
            }
        } catch (err) {
            app.log?.warn(`Pin for ${browserSessionId} was written but its notification failed: ${err.toString()}`)
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
