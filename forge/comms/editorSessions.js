/**
 * This module tracks which browser sessions have the NR editor open
 * for which instances. It follows the same heartbeat pattern as device
 * log heartbeats in devices.js.
 *
 * Heartbeats arrive via MQTT on: ff/v1/<teamId>/p/<projectId>/editor/heartbeat
 * Payload: JSON { sessionId, userId, action: 'alive'|'leaving' }
 */

class EditorSessionHandler {
    // Browser background tabs throttle timers to ~60s; allow 2 missed
    // intervals before considering a session stale.
    static STALE_THRESHOLD_MS = 120_000

    /**
     * @param {import('../forge').ForgeApplication} app Fastify app
     * @param {import('./commsClient').CommsClient} client Comms Client
     */
    constructor (app, client) {
        this.app = app
        this.client = client

        // editorSessions[projectId] = { sessionId, userId, teamId, lastHeartbeat }
        this.editorSessions = {}
        this.sweepInterval = -1

        // Listen for editor heartbeat events from the comms client
        client.on('editor/heartbeat', (beat) => {
            this.editorSessions[beat.projectId] = {
                sessionId: beat.sessionId,
                userId: beat.userId,
                teamId: beat.teamId,
                lastHeartbeat: beat.timestamp
            }
        })

        client.on('editor/leaving', (beat) => {
            delete this.editorSessions[beat.projectId]
        })

        // Sweep stale entries every 30 seconds
        this.sweepInterval = setInterval(() => {
            const now = Date.now()
            for (const [projectId, session] of Object.entries(this.editorSessions)) {
                if (now - session.lastHeartbeat > EditorSessionHandler.STALE_THRESHOLD_MS) {
                    delete this.editorSessions[projectId]
                }
            }
        }, 30_000)
    }

    /**
     * Get the active editor session for a project, if any.
     * @param {string} projectId - The project/instance ID
     * @returns {object|null} Session info { sessionId, userId, teamId, lastHeartbeat } or null
     */
    getActiveSession (projectId) {
        const session = this.editorSessions[projectId]
        if (!session) return null
        if (Date.now() - session.lastHeartbeat > EditorSessionHandler.STALE_THRESHOLD_MS) {
            delete this.editorSessions[projectId]
            return null
        }
        return session
    }

    /**
     * Stop the sweep interval (for clean shutdown)
     */
    stop () {
        clearInterval(this.sweepInterval)
    }
}

module.exports = {
    EditorSessionHandler: (app, client) => new EditorSessionHandler(app, client)
}
