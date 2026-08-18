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
    private $userId: string | null = null
    private $sessionId: string | null = null

    constructor (options: CreatePublisherOptions<Transport>) {
        super({ name: 'tabPresence', ...options })
    }

    protected _onStarted (teamId: string, userId: string): void {
        // _onConnect fires again on every broker reconnect, so tear down any timers
        // and listeners from a previous run before registering new ones.
        this._onStopped()

        const authStore = useAccountAuthStore()
        this.$userId = userId
        this.$sessionId = authStore.getSessionId()

        this._publishPresence()

        this.$heartbeatTimer = setInterval(() => this._publishPresence(), HEARTBEAT_INTERVAL)

        if (this.$router) {
            // TODO this should reside in it's dedicated route guard
            this.$removeRouterGuard = this.$router.afterEach(() => {
                this._publishPresence()
            })
        }

        this.$onVisibilityChange = () => this._publishPresence()
        document.addEventListener('visibilitychange', this.$onVisibilityChange)
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

        this.$userId = null
        this.$sessionId = null
    }

    /**
     * Publishes the full tab snapshot. The platform replaces its cache entry with
     * whatever this sends, so every message has to carry the complete state.
     */
    private _publishPresence (): void {
        if (!this.$userId || !this.$sessionId) return
        const contextStore = useContextStore()
        const topic = `ff/v1/browser/tab-presence/${this.$userId}/${this.$sessionId}/heartbeat`
        this._publish(topic, {
            visibility: document.visibilityState,
            focused: document.hasFocus(),
            context: contextStore.expert
        }).catch((err) => {
            console.warn('Failed to publish tab presence:', err)
        })
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
