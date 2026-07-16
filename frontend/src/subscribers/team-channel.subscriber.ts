import { BaseSubscriber } from './subscriber.contract'

import teamApi from '@/api/team.js'
import { useAccountAuthStore } from '@/stores/account-auth.js'
import { useContextStore } from '@/stores/context.js'
import { useLiveStatusStore } from '@/stores/live-status'
import { Maybe } from '@/types/common/types'
import type { CreateSubscriberOptions, TeamChannelSubscriberI, TeamRef } from '@/types/subscribers/subscriber.types'

const MEMBERSHIP_TOPIC_REGEX = /^ff\/v1\/[^/]+\/u\/([^/]+)\/membership$/
const TEAM_UPDATED_TOPIC_REGEX = /^ff\/v1\/[^/]+\/t\/updated$/
const DEVICE_STATE_TOPIC_REGEX = /^ff\/v1\/[^/]+\/d\/[^/]+\/state$/
const INSTANCE_STATE_TOPIC_REGEX = /^ff\/v1\/[^/]+\/p\/[^/]+\/state$/

function connectionKey (teamId: string): string {
    return `team:${teamId}`
}

class TeamChannelSubscriber extends BaseSubscriber implements TeamChannelSubscriberI {
    protected $connectedTeamId: Maybe<string> = null

    constructor ({ app, router, transport, subscribers }: CreateSubscriberOptions) {
        super({
            name: 'teamChannel',
            app,
            router,
            transport,
            subscribers
        })
    }

    isConnected (): boolean {
        return this.$connectedTeamId !== null
    }

    async connect (team: Maybe<TeamRef>): Promise<void> {
        if (!team?.id || typeof team.id !== 'string' || team.id.length === 0) return
        const authStore = useAccountAuthStore()
        const userId = authStore.user?.id
        if (!userId) return
        if (this.$connectedTeamId === team.id) return

        await this.disconnect()

        const transport = this.$transport
        if (!transport) return

        const teamId = team.id
        const sessionId = authStore.getSessionId()
        const key = connectionKey(teamId)

        try {
            await transport.connect(key, {
                getCredentials: () => teamApi.getTeamCommsCreds(teamId, sessionId),
                onMessage: (topic, message) => this._onMessage(topic, message),
                onConnect: () => this._onConnect(teamId, userId),
                // close/offline/disconnect/error: nothing to do — the transport
                // handles reconnect; terminal failures surface via this catch
                onClose: () => {},
                onOffline: () => {},
                onDisconnect: () => {},
                onError: () => {}
            })
            this.$connectedTeamId = teamId
        } catch {
            // graceful degrade — no broker, bad creds, or network
            this.$connectedTeamId = null
        }
    }

    async disconnect (): Promise<void> {
        if (!this.$connectedTeamId) return
        const transport = this.$transport
        const key = connectionKey(this.$connectedTeamId)
        this.$connectedTeamId = null
        if (!transport) return
        try {
            await transport.disconnect(key)
            useLiveStatusStore().clear()
        } catch {
            // ignore teardown failures
        }
    }

    async destroy (): Promise<void> {
        await this.disconnect()
    }

    protected async _onConnect (teamId: string, userId: string): Promise<void> {
        const transport = this.$transport
        if (!transport) return
        try {
            await transport.subscribe(connectionKey(teamId), [
                `ff/v1/${teamId}/t/updated`,
                `ff/v1/${teamId}/u/${userId}/membership`,
                `ff/v1/${teamId}/p/+/state`,
                `ff/v1/${teamId}/d/+/state`
            ], { qos: 1 })

            useLiveStatusStore().setLive(true)
        } catch {
            // non-fatal — the transport replays subscriptions on reconnect
        }
    }

    protected _onMessage (topic: string, message: Buffer | Uint8Array | string): void {
        let payload: { reason?: string } = {}
        try {
            const raw = typeof message === 'string'
                ? message
                : (message?.toString ? message.toString() : '')
            payload = raw ? JSON.parse(raw) : {}
        } catch {
            payload = {}
        }

        for (const { pattern, handle } of this._topicRoutes()) {
            if (pattern.test(topic)) {
                handle(payload)
                return
            }
        }
    }

    // topic pattern → store action; the store owns interpretation (what a
    // reason means, what to refresh). Add a row per new sync-able entity.
    protected _topicRoutes (): Array<{ pattern: RegExp, handle: (payload: { reason?: string, id?: string, meta?: { state?: string, versions?: Record<string, string> } }) => void }> {
        return [
            { pattern: MEMBERSHIP_TOPIC_REGEX, handle: (payload) => this._onMembership(payload) },
            { pattern: TEAM_UPDATED_TOPIC_REGEX, handle: () => this._onTeamUpdated() },
            { pattern: DEVICE_STATE_TOPIC_REGEX, handle: (payload) => this._onDeviceStatus(payload) },
            { pattern: INSTANCE_STATE_TOPIC_REGEX, handle: (payload) => this._onInstanceStatus(payload) }
        ]
    }

    protected _onInstanceStatus (payload: { id?: string, meta?: { state?: string, versions?: Record<string, string> } }): void {
        if (!payload?.id || !payload.meta?.state) return
        try {
            useLiveStatusStore().setInstanceStatus(payload.id, payload.meta.state, payload.meta.versions)
        } catch {}
    }

    protected _onDeviceStatus (payload: { id?: string, meta?: { state?: string } }): void {
        if (!payload?.id || !payload.meta?.state) return
        try {
            useLiveStatusStore().setDeviceStatus(payload.id, payload.meta.state)
        } catch {}
    }

    protected _onMembership (payload: { reason?: string }): void {
        try {
            useContextStore().onTeamChannelMembership(payload).catch(() => undefined)
        } catch {}
    }

    protected _onTeamUpdated (): void {
        try {
            useContextStore().refreshTeam().catch(() => undefined)
        } catch {}
    }
}

let TeamChannelSubscriberInstance: Maybe<TeamChannelSubscriber> = null

export function createTeamChannelSubscriber ({ app, router, transport, subscribers }: CreateSubscriberOptions): TeamChannelSubscriber {
    if (!TeamChannelSubscriberInstance) {
        TeamChannelSubscriberInstance = new TeamChannelSubscriber({
            app,
            router,
            transport,
            subscribers
        })
    }
    return TeamChannelSubscriberInstance
}

export async function destroyTeamChannelSubscriber (): Promise<void> {
    if (!TeamChannelSubscriberInstance) return
    await TeamChannelSubscriberInstance.destroy()
    TeamChannelSubscriberInstance = null
}

export default createTeamChannelSubscriber
