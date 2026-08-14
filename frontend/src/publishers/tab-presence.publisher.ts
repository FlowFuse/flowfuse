import { definePublisherSingleton } from './publisher.factory'
import { TeamPublisher } from './team-publisher.contract'

import getAppOrchestrator from '@/services/app.orchestrator'
import { useAccountAuthStore } from '@/stores/account-auth.js'
import { useContextStore } from '@/stores/context.js'
import { createMqttTransport } from '@/transport/mqtt.transport'
import type { CreatePublisherOptions } from '@/types/publishers/publisher.types'
import type { TeamRef } from '@/types/subscribers/subscriber.types'
import type { Transport } from '@/types/transport/transport.types'

const HEARTBEAT_INTERVAL = 45_000

class TabPresencePublisher extends TeamPublisher {
    private $heartbeatTimer: ReturnType<typeof setInterval> | null = null
    private $removeRouterGuard: (() => void) | null = null
    private $onVisibilityChange: (() => void) | null = null
    private $onBeforeUnload: (() => void) | null = null
    private $userId: string | null = null
    private $sessionId: string | null = null

    constructor (options: CreatePublisherOptions<Transport>) {
        super({ name: 'tabPresence', ...options })
    }

    protected _onStarted (teamId: string, userId: string): void {
        const authStore = useAccountAuthStore()
        this.$userId = userId
        this.$sessionId = authStore.getSessionId()

        this._publishHeartbeat()
        this._publishContext()

        this.$heartbeatTimer = setInterval(() => this._publishHeartbeat(), HEARTBEAT_INTERVAL)

        if (this.$router) {
            this.$removeRouterGuard = this.$router.afterEach(() => {
                this._publishContext()
            })
        }

        this.$onVisibilityChange = () => this._publishHeartbeat()
        document.addEventListener('visibilitychange', this.$onVisibilityChange)

        this.$onBeforeUnload = () => this._clearOnUnload()
        window.addEventListener('beforeunload', this.$onBeforeUnload)
    }

    protected _onStopped (): void {
        if (this.$heartbeatTimer) {
            clearInterval(this.$heartbeatTimer)
            this.$heartbeatTimer = null
        }

        if (this.$removeRouterGuard) {
            this.$removeRouterGuard()
            this.$removeRouterGuard = null
        }

        if (this.$onVisibilityChange) {
            document.removeEventListener('visibilitychange', this.$onVisibilityChange)
            this.$onVisibilityChange = null
        }

        if (this.$onBeforeUnload) {
            window.removeEventListener('beforeunload', this.$onBeforeUnload)
            this.$onBeforeUnload = null
        }

        this.$userId = null
        this.$sessionId = null
    }

    private _publishHeartbeat (): void {
        if (!this.$userId || !this.$sessionId) return
        const topic = `ff/v1/browser/tab-presence/${this.$userId}/${this.$sessionId}/heartbeat`
        this._publish(topic, {
            visibility: document.visibilityState,
            focused: document.hasFocus()
        }).catch(() => {})
    }

    private _publishContext (): void {
        if (!this.$userId || !this.$sessionId) return
        const contextStore = useContextStore()
        const topic = `ff/v1/browser/tab-presence/${this.$userId}/${this.$sessionId}/context`
        this._publish(topic, contextStore.expert).catch(() => {})
    }

    private _clearOnUnload (): void {
        if (!this.$userId || !this.$sessionId) return
        try {
            const url = `/api/v1/user/browser-sessions/${this.$sessionId}`
            fetch(url, { method: 'DELETE', keepalive: true, credentials: 'same-origin' })
        } catch {
            // best-effort
        }
    }
}

const { create: createTabPresencePublisher, destroy: destroyTabPresencePublisher } = definePublisherSingleton(TabPresencePublisher)

export function startTabPresence (team: TeamRef): TabPresencePublisher {
    const orchestrator = getAppOrchestrator()
    const transport = createMqttTransport(orchestrator.$services.mqtt)
    const publisher = createTabPresencePublisher({
        app: orchestrator.$app,
        router: orchestrator.$router,
        transport
    })
    publisher.connect(team)
    return publisher
}

export async function stopTabPresence (): Promise<void> {
    await destroyTabPresencePublisher()
}
