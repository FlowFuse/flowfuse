import { v4 as uuidv4 } from 'uuid'

import { BaseService } from './service.contract'

import teamApi from '@/api/team.js'
import { useAccountAuthStore } from '@/stores/account-auth.js'
import { useContextStore } from '@/stores/context.js'
import { Maybe } from '@/types/common/types'
import type { CreateServiceOptions } from '@/types/services/service.types'
import type {
    StatusCallback,
    StatusPayload,
    TeamChannelServiceI,
    TeamRef
} from '@/types/services/team-channel.types'

const MEMBERSHIP_TOPIC_REGEX = /^ff\/v1\/[^/]+\/u\/([^/]+)\/membership$/
const INSTANCE_STATE_TOPIC_REGEX = /^ff\/v1\/[^/]+\/p\/([^/]+)\/state$/
const DEVICE_STATE_TOPIC_REGEX = /^ff\/v1\/[^/]+\/d\/([^/]+)\/state$/

type ResourceKind = 'p' | 'd'

function connectionKey (teamId: string): string {
    return `team:${teamId}`
}

function stateTopic (teamId: string, kind: ResourceKind, id: string): string {
    return `ff/v1/${teamId}/${kind}/${id}/state`
}

class TeamChannelService extends BaseService implements TeamChannelServiceI {
    protected $sessionId: Maybe<string> = null
    protected $connectedTeamId: Maybe<string> = null
    protected $pendingConnect: Maybe<Promise<void>> = null
    protected $instanceListeners: Map<string, Set<StatusCallback>> = new Map()
    protected $deviceListeners: Map<string, Set<StatusCallback>> = new Map()

    constructor ({ app, router, services }: CreateServiceOptions) {
        super({
            name: 'teamChannel',
            app,
            router,
            services
        })
    }

    // Minted per page-load so duplicated tabs (which clone sessionStorage in
    // most browsers) still get distinct credentials and don't kick each other.
    getSessionId (): string {
        if (!this.$sessionId) this.$sessionId = uuidv4()
        return this.$sessionId
    }

    isConnected (): boolean {
        return this.$connectedTeamId !== null
    }

    // Awaits any in-flight connect so callers don't race the initial setTeam handshake.
    async ready (): Promise<boolean> {
        while (this.$pendingConnect) {
            try { await this.$pendingConnect } catch {}
        }
        return this.isConnected()
    }

    async connect (team: Maybe<TeamRef>): Promise<void> {
        const promise = this._doConnect(team)
        this.$pendingConnect = promise
        try {
            await promise
        } finally {
            if (this.$pendingConnect === promise) {
                this.$pendingConnect = null
            }
        }
    }

    protected async _doConnect (team: Maybe<TeamRef>): Promise<void> {
        if (!team?.id || typeof team.id !== 'string' || team.id.length === 0) return
        const authStore = useAccountAuthStore()
        const userId = authStore.user?.id
        if (!userId) return
        if (this.$connectedTeamId === team.id) return

        await this.disconnect()

        const mqtt = this.$services?.mqtt
        if (!mqtt) return

        const teamId = team.id
        const sessionId = this.getSessionId()
        const key = connectionKey(teamId)

        try {
            await mqtt.createClient(key, {
                getCredentials: () => teamApi.getTeamCommsCreds(teamId, sessionId),
                onMessage: (topic: string, message: Buffer) => this._onMqttMessage(topic, message),
                onConnect: () => this._onMqttConnect(teamId, userId),
                onClose: () => this._onMqttClose(),
                onOffline: () => this._onMqttOffline(),
                onError: (err: Error) => this._onMqttError(err),
                onDisconnect: () => this._onMqttDisconnect()
            })
            this.$connectedTeamId = teamId
        } catch {
            // graceful degrade — no broker, bad creds, or network
            this.$connectedTeamId = null
        }
    }

    subscribeInstance (id: string, cb: StatusCallback): () => void {
        return this._subscribeResource('p', id, cb, this.$instanceListeners)
    }

    subscribeDevice (id: string, cb: StatusCallback): () => void {
        return this._subscribeResource('d', id, cb, this.$deviceListeners)
    }

    protected _subscribeResource (
        kind: ResourceKind,
        id: string,
        cb: StatusCallback,
        map: Map<string, Set<StatusCallback>>
    ): () => void {
        if (!id || typeof cb !== 'function') return () => {}
        const teamId = this.$connectedTeamId
        if (!teamId) return () => {}

        let set = map.get(id)
        const firstListener = !set
        if (!set) {
            set = new Set()
            map.set(id, set)
        }
        set.add(cb)

        if (firstListener) {
            const mqtt = this.$services?.mqtt
            // mqtt.service replays subscriptions on reconnect — no explicit retry needed.
            mqtt?.subscribe(connectionKey(teamId), stateTopic(teamId, kind, id), { qos: 1 })
                .catch(() => undefined)
        }

        return () => this._unsubscribeResource(kind, id, cb, map)
    }

    protected _unsubscribeResource (
        kind: ResourceKind,
        id: string,
        cb: StatusCallback,
        map: Map<string, Set<StatusCallback>>
    ): void {
        const set = map.get(id)
        if (!set) return
        set.delete(cb)
        if (set.size > 0) return
        map.delete(id)
        const teamId = this.$connectedTeamId
        if (!teamId) return
        const mqtt = this.$services?.mqtt
        mqtt?.unsubscribe(connectionKey(teamId), stateTopic(teamId, kind, id))
            .catch(() => undefined)
    }

    async disconnect (): Promise<void> {
        if (!this.$connectedTeamId) return
        const mqtt = this.$services?.mqtt
        const key = connectionKey(this.$connectedTeamId)
        this.$connectedTeamId = null
        this.$instanceListeners.clear()
        this.$deviceListeners.clear()
        if (!mqtt) return
        try {
            await mqtt.destroyClient(key)
        } catch {
            // ignore teardown failures
        }
    }

    async destroy (): Promise<void> {
        await this.disconnect()
        this.$sessionId = null
    }

    protected async _onMqttConnect (teamId: string, userId: string): Promise<void> {
        const mqtt = this.$services?.mqtt
        if (!mqtt) return
        try {
            await mqtt.subscribe(connectionKey(teamId), [
                `ff/v1/${teamId}/team/updated`,
                `ff/v1/${teamId}/u/${userId}/membership`
            ], { qos: 1 })
        } catch (err) {
            // non-fatal — mqtt.service replays subscriptions on reconnect
            this._onMqttError(err instanceof Error ? err : new Error(String(err)))
        }
    }

    protected _onMqttClose (): void {
        // no-op — reconnect handled by mqtt.service
    }

    protected _onMqttOffline (): void {
        // no-op — reconnect handled by mqtt.service
    }

    protected _onMqttDisconnect (): void {
        // no-op — reconnect handled by mqtt.service
    }

    protected _onMqttError (err: Error): undefined {
        // no-op — terminal failures handled by connect()'s catch; transients retried by mqtt.service
        return err && undefined
    }

    protected _onMqttMessage (topic: string, message: Buffer | Uint8Array | string): void {
        let payload: Record<string, unknown> = {}
        try {
            const raw = typeof message === 'string'
                ? message
                : (message?.toString ? message.toString() : '')
            payload = raw ? JSON.parse(raw) : {}
        } catch {
            payload = {}
        }

        const membershipMatch = MEMBERSHIP_TOPIC_REGEX.exec(topic)
        if (membershipMatch) {
            this._handleMembership(payload as { reason?: string })
            return
        }
        if (topic.endsWith('/team/updated')) {
            this._handleTeamUpdated()
            return
        }
        const instanceMatch = INSTANCE_STATE_TOPIC_REGEX.exec(topic)
        if (instanceMatch) {
            this._dispatchStatus(this.$instanceListeners, instanceMatch[1], payload as StatusPayload)
            return
        }
        const deviceMatch = DEVICE_STATE_TOPIC_REGEX.exec(topic)
        if (deviceMatch) {
            this._dispatchStatus(this.$deviceListeners, deviceMatch[1], payload as StatusPayload)
        }
    }

    protected _dispatchStatus (
        map: Map<string, Set<StatusCallback>>,
        id: string,
        payload: StatusPayload
    ): void {
        const set = map.get(id)
        if (!set) return
        // Snapshot so a listener that unsubscribes during dispatch doesn't mutate the iterator.
        for (const cb of Array.from(set)) {
            try { cb(payload) } catch {}
        }
    }

    protected _handleMembership (payload: { reason?: string }): void {
        if (payload?.reason === 'removed') {
            // Only act if the user is on a team-scoped route — leave them
            // alone if they're already on /account or another non-team page.
            const path = this.$router?.currentRoute?.value?.path
            if (typeof path === 'string' && path.startsWith('/team/')) {
                // Hard reload — a soft push to Home bounces back to the current team
                try { window.location.assign('/') } catch {}
            }
            return
        }
        try {
            useContextStore().refreshTeamMembership().catch(() => undefined)
        } catch {}
    }

    protected _handleTeamUpdated (): void {
        try {
            useContextStore().refreshTeam().catch(() => undefined)
        } catch {}
    }
}

let TeamChannelServiceInstance: Maybe<TeamChannelService> = null

export function createTeamChannelService ({ app, router, services }: CreateServiceOptions): TeamChannelService {
    if (!TeamChannelServiceInstance) {
        TeamChannelServiceInstance = new TeamChannelService({
            app,
            router,
            services
        })
    }
    return TeamChannelServiceInstance
}

export async function destroyTeamChannelService (): Promise<void> {
    if (!TeamChannelServiceInstance) return
    await TeamChannelServiceInstance.destroy()
    TeamChannelServiceInstance = null
}

export default createTeamChannelService
