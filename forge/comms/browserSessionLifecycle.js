/**
 * Routes browser session events to whoever cares about them.
 *
 * Every event a browser tab emits arrives on one topic shape:
 *   ff/v1/<teamHash>/u/<userHash>/s/<sessionId>/<event>
 *
 * `disconnected` is the connection's last will. The broker publishes it when a
 * tab goes away without a clean disconnect. New consumers of that signal belong in
 * handleDisconnected - they should not need a topic of their own.
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

    async handleSessionEvent ({ userId, sessionId, event, payload }) {
        switch (event) {
        case 'heartbeat':
            await this.app.db.controllers.BrowserSession.recordPresence(userId, sessionId, payload)
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
}

module.exports = {
    BrowserSessionLifecycleHandler: (app, client) => new BrowserSessionLifecycleHandler(app, client)
}
