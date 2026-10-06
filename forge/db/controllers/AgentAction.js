/**
 * Tracks agent-triggered actions (a deploy, a package install, ...) that are about to happen,
 * so the resulting native Node-RED audit event can be attributed to the agent instead of
 * looking like a manual action.
 *
 * Written by the MCP Gateway/Expert Chat (via platformAutomation.js's agent-action-pending
 * command) right before it dispatches the action to the browser, and read by the
 * POST /logging/.../audit routes when the matching audit event arrives moments later.
 * Single-use and short-lived: a signal that's never consumed simply expires.
 *
 * @namespace controllers.AgentAction
 * @memberof forge.db.controllers
 */

const CACHE_NAME = 'agent-action-pending'
const CACHE_TTL = 60 * 1000

function pendingKey ({ userHashid, entityType, entityId, action, module }) {
    const base = `${userHashid}:${entityType}:${entityId}:${action}`
    return module ? `${base}:${module}` : base
}

module.exports = {
    init (app) {
        app.caches.createCache(CACHE_NAME, { max: 1000, ttl: CACHE_TTL })
    },

    /** Record that `target` is about to happen, carrying `context` ({ source, toolName }) for later attribution. */
    async setPending (app, target, context) {
        await app.caches.getCache(CACHE_NAME).set(pendingKey(target), context)
    },

    /** Drop a pending signal early - the dispatched action turned out to be a no-op or failed before it could run. */
    async clearPending (app, target) {
        await app.caches.getCache(CACHE_NAME).del(pendingKey(target))
    },

    /** Returns and removes the pending context for `target`, or null if there isn't one. */
    async consumePending (app, target) {
        const cache = app.caches.getCache(CACHE_NAME)
        const key = pendingKey(target)
        const pending = await cache.get(key)
        if (pending) {
            await cache.del(key)
        }
        return pending || null
    }
}
