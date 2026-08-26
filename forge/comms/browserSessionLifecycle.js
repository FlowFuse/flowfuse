/**
 * Routes browser session events to whoever cares about them.
 *
 * Every event a browser tab emits arrives on one topic shape:
 *   ff/v1/<teamHash>/u/<userHash>/s/<sessionId>/<event>
 *
 * `disconnected` is the connection's last will. The broker publishes it when a
 * tab goes away without a clean disconnect. New consumers of that signal belong in
 * handleDisconnected - they should not need a topic of their own.
 *
 * Traffic also goes the other way: notifyMcp publishes back to a single tab on
 * ff/v1/<teamHash>/u/<userHash>/s/<sessionId>/mcp/<event>. The broker ACL pins the
 * session segment to the subscribing connection's own credential, so a tab can only
 * ever hear about itself.
 */
class BrowserSessionLifecycleHandler {
    constructor (app, client) {
        this.app = app
        this.client = client
        this.setupEventHandlers()
    }

    setupEventHandlers () {
        this.client.on('browser-session', (msg) => {
            this.handleSessionEvent(msg).catch((err) => {
                this.app.log.warn(`Failed to handle browser session event: ${err.toString()}`)
            })
        })
    }

    async handleSessionEvent ({ teamId, userId, sessionId, event, payload }) {
        switch (event) {
        case 'heartbeat':
            // teamId is carried so the tab's snapshot knows which topic tree it lives
            // under, which is what lets the platform publish back to it later from a
            // context that only has the session id (a pin made over MCP, for instance).
            await this.app.db.controllers.BrowserSession.recordPresence(userId, sessionId, payload, teamId)
            break
        case 'close':
            // The user opted this tab out. The connection is still alive.
            await this.app.db.controllers.BrowserSession.removeSession(userId, sessionId)
            break
        case 'disconnected':
            await this.handleDisconnected(userId, sessionId)
            break
        }
    }

    /**
     * The tab's connection is gone. Fans out to every subsystem that keeps
     * per-session state.
     */
    async handleDisconnected (userId, sessionId) {
        await this.app.db.controllers.BrowserSession.removeSession(userId, sessionId)
    }

    /**
     * Tell one browser tab something about its MCP state.
     *
     * Best effort by design: a tab whose snapshot predates teamId being recorded, or
     * a platform with no broker configured, simply does not get told. Nothing upstream
     * should fail because a notification could not be delivered - the tab re-learns
     * the truth on its next heartbeat either way.
     */
    notifyMcp (teamId, userId, sessionId, event, payload = {}) {
        if (!teamId || !userId || !sessionId || !event) {
            return
        }
        const topic = `ff/v1/${teamId}/u/${userId}/s/${sessionId}/mcp/${event}`
        this.client.publish(topic, JSON.stringify(payload), { qos: 1, retain: false })
    }
}

module.exports = {
    BrowserSessionLifecycleHandler: (app, client) => new BrowserSessionLifecycleHandler(app, client)
}
