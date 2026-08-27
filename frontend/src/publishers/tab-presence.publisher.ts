import { definePublisherSingleton } from './publisher.factory'
import { TeamPublisher } from './team-publisher.contract'

import { useAccountAuthStore } from '@/stores/account-auth.js'
import { useContextStore } from '@/stores/context.js'
import { useProductMcpStore } from '@/stores/product-mcp.js'
import type { CreatePublisherOptions } from '@/types/publishers/publisher.types'
import type { Transport } from '@/types/transport/transport.types'

const HEARTBEAT_INTERVAL = 45_000

class TabPresencePublisher extends TeamPublisher {
    private $heartbeatTimer: ReturnType<typeof setInterval> | null = null
    private $removeRouterGuard: (() => void) | null = null
    private $onVisibilityChange: (() => void) | null = null
    private $userId: string | null = null
    private $sessionId: string | null = null
    private $teamId: string | null = null

    constructor (options: CreatePublisherOptions<Transport>) {
        super({ name: 'tabPresence', ...options })
    }

    /**
     * Publishes presence immediately, whether or not this call also (re)connected.
     *
     * The transport is shared per team and _connect short-circuits when it is already
     * attached, so a caller that re-enables presence over a live connection would
     * otherwise get no heartbeat and stay unlisted until the interval came round.
     */
    announcePresence (): void {
        this._publishPresence()
    }

    /**
     * This publisher only runs while MCP is exposed and is the thing meant to beat
     * continuously, so its health is the tab's health.
     */
    protected _onLinkDown (): void {
        useProductMcpStore().markInterrupted()
    }

    protected _onStarted (teamId: string, userId: string): void {
        // _onConnect fires again on every broker reconnect, so tear down any timers
        // and listeners from a previous run before registering new ones.
        this._onStopped()
        // Runs on first connect and every reconnect, so it doubles as the all-clear
        useProductMcpStore().markLinkHealthy()

        const authStore = useAccountAuthStore()
        this.$userId = userId
        this.$sessionId = authStore.getSessionId()
        this.$teamId = teamId

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
        this.$teamId = null
    }

    /**
     * Tells the platform to drop this tab's session entry. Without it the entry
     * lingers until the cache TTL expires, leaving the tab listed as targetable
     * for a couple of minutes after the user opted out.
     */
    protected async _onStopping (): Promise<void> {
        const topic = this._sessionTopic('close')
        if (!topic) return
        await this._publish(topic, {}).catch((err) => {
            console.warn('Failed to publish tab presence close:', err)
        })
    }

    /**
     * ff/v1/<teamId>/u/<userId>/s/<sessionId>/<event> - the same
     * scope/entity/id/event shape as every other topic this client speaks.
     */
    private _sessionTopic (event: string): string | null {
        if (!this.$teamId || !this.$userId || !this.$sessionId) return null
        return `ff/v1/${this.$teamId}/u/${this.$userId}/s/${this.$sessionId}/${event}`
    }

    /**
     * Publishes the full tab snapshot. The platform replaces its cache entry with
     * whatever this sends, so every message has to carry the complete state.
     */
    private _publishPresence (): void {
        const topic = this._sessionTopic('heartbeat')
        if (!topic) return
        const contextStore = useContextStore()
        const context = contextStore.expert
        this._publish(topic, {
            visibility: document.visibilityState,
            focused: document.hasFocus(),
            capabilities: this._capabilities(context),
            context
        }).then(() => {
            // A publish can be rejected while the socket stays up (ACL change, rate limit),
            // and no reconnect follows to clear that. A heartbeat landing is the all-clear
            // for exactly the case _onStarted cannot cover.
            useProductMcpStore().markLinkHealthy()
        }).catch((err) => {
            console.warn('Failed to publish tab presence:', err)
            // A heartbeat that does not land leaves the platform's entry going stale, even
            // if the socket still looks up
            useProductMcpStore().markInterrupted()
        })
    }

    /**
     * The tool groups this tab can answer for, named the same way the served tool catalog
     * groups them. Consumers pick a tab by the group they need to dispatch, so this is a flat
     * list of group names rather than the several `supports*` booleans it is derived from.
     */
    private _capabilities (context: { supportsPlatformAutomation?: boolean, supportsPlatformUIAutomation?: boolean, scope?: string, assistantVersion?: string | null }): string[] {
        const capabilities: string[] = []
        if (context?.supportsPlatformAutomation) capabilities.push('platform')
        if (context?.supportsPlatformUIAutomation) capabilities.push('platform_ui')
        // flow_building dispatches into the Node-RED editor, so it needs the assistant present
        // in an immersive tab - a plain platform page cannot answer for it.
        if (context?.scope === 'immersive' && context?.assistantVersion) capabilities.push('flow_building')
        return capabilities
    }
}

const { create: createTabPresencePublisher, destroy: destroyTabPresencePublisher } = definePublisherSingleton(TabPresencePublisher)

export { createTabPresencePublisher, destroyTabPresencePublisher }

export default createTabPresencePublisher
