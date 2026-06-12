import { BaseService } from './service.contract'

import teamApi from '@/api/team.js'
import { useAccountAuthStore } from '@/stores/account-auth.js'
import { useContextStore } from '@/stores/context.js'
import { Maybe } from '@/types/common/types'
import type { CreateServiceOptions } from '@/types/services/service.types'
import type { TeamChannelServiceI, TeamRef } from '@/types/services/team-channel.types'

const MEMBERSHIP_TOPIC_REGEX = /^ff\/v1\/[^/]+\/u\/([^/]+)\/membership$/
const TEAM_UPDATED_TOPIC_REGEX = /^ff\/v1\/[^/]+\/t\/updated$/

function connectionKey (teamId: string): string {
    return `team:${teamId}`
}

class TeamChannelService extends BaseService implements TeamChannelServiceI {
    protected $connectedTeamId: Maybe<string> = null

    constructor ({ app, router, services }: CreateServiceOptions) {
        super({
            name: 'teamChannel',
            app,
            router,
            services
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

        const mqtt = this.$services?.mqtt
        if (!mqtt) return

        const teamId = team.id
        const sessionId = authStore.getSessionId()
        const key = connectionKey(teamId)

        try {
            await mqtt.createClient(key, {
                getCredentials: () => teamApi.getTeamCommsCreds(teamId, sessionId),
                onMessage: (topic: string, message: Buffer) => this._onMqttMessage(topic, message),
                onConnect: () => this._onMqttConnect(teamId, userId),
                // close/offline/disconnect/error: nothing to do — mqtt.service
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
        const mqtt = this.$services?.mqtt
        const key = connectionKey(this.$connectedTeamId)
        this.$connectedTeamId = null
        if (!mqtt) return
        try {
            await mqtt.destroyClient(key)
        } catch {
            // ignore teardown failures
        }
    }

    async destroy (): Promise<void> {
        await this.disconnect()
    }

    protected async _onMqttConnect (teamId: string, userId: string): Promise<void> {
        const mqtt = this.$services?.mqtt
        if (!mqtt) return
        try {
            await mqtt.subscribe(connectionKey(teamId), [
                `ff/v1/${teamId}/t/updated`,
                `ff/v1/${teamId}/u/${userId}/membership`
            ], { qos: 1 })
        } catch {
            // non-fatal — mqtt.service replays subscriptions on reconnect
        }
    }

    protected _onMqttMessage (topic: string, message: Buffer | Uint8Array | string): void {
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

    // topic pattern → handler; add a row per new sync-able entity
    protected _topicRoutes (): Array<{ pattern: RegExp, handle: (payload: { reason?: string }) => void }> {
        return [
            { pattern: MEMBERSHIP_TOPIC_REGEX, handle: (payload) => this._handleMembership(payload) },
            { pattern: TEAM_UPDATED_TOPIC_REGEX, handle: () => this._handleTeamUpdated() }
        ]
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
