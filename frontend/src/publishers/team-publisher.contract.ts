import type { App } from 'vue'
import type { Router } from 'vue-router'

import teamApi from '@/api/team.js'
import { useAccountAuthStore } from '@/stores/account-auth.js'
import { Maybe } from '@/types/common/types'
import type { CreatePublisherOptions } from '@/types/publishers/publisher.types'
import type { MqttPayload } from '@/types/services/mqtt.types'
import type { TeamRef } from '@/types/subscribers/subscriber.types'
import type { Transport, TransportAttachmentHandle, TransportPublishOptions } from '@/types/transport/transport.types'

export function connectionKey (teamId: string): string {
    return `team:${teamId}`
}

export abstract class TeamPublisher<TTransport extends Transport = Transport> {
    protected $name: string

    protected $app: Maybe<App> = null

    protected $router: Maybe<Router> = null

    protected $transport: Maybe<TTransport> = null

    protected $connectedTeamId: Maybe<string> = null

    protected $attachment: Maybe<TransportAttachmentHandle> = null

    protected $operation: Maybe<Promise<unknown>> = null

    protected constructor ({
        name,
        app,
        router,
        transport
    }: { name: string } & CreatePublisherOptions<TTransport>) {
        this.$name = name
        this.$app = app
        this.$router = router
        this.$transport = transport
    }

    init () {
        return undefined
    }

    isConnected (): boolean {
        return this.$connectedTeamId !== null
    }

    async connect (team: Maybe<TeamRef>): Promise<void> {
        await this.runPublisherOperation(() => this._connect(team))
    }

    async disconnect (): Promise<void> {
        await this.runPublisherOperation(() => this._disconnect())
    }

    async destroy (): Promise<void> {
        await this.disconnect()
    }

    async runPublisherOperation<T> (operation: () => Promise<T> | T): Promise<T> {
        const previous = this.$operation ?? Promise.resolve()
        const current = previous
            .catch(() => {})
            .then(operation)

        const tracked = current.finally(() => {
            if (this.$operation === tracked) {
                this.$operation = null
            }
        })
        this.$operation = tracked

        return tracked
    }

    protected async _connect (team: Maybe<TeamRef>): Promise<void> {
        if (!team?.id || typeof team.id !== 'string' || team.id.length === 0) return
        const authStore = useAccountAuthStore()
        const userId = authStore.user?.id
        if (!userId) return
        if (this.$connectedTeamId === team.id) return

        await this._disconnect()

        const transport = this.$transport
        if (!transport) return

        const teamId = team.id
        const sessionId = authStore.getSessionId()
        const key = connectionKey(teamId)

        try {
            this.$attachment = await transport.attach(key, {
                getCredentials: () => teamApi.getTeamCommsCreds(teamId, sessionId),
                onMessage: () => {},
                onConnect: () => this._onConnect(teamId, userId),
                onClose: () => {},
                onOffline: () => {},
                onDisconnect: () => {},
                onError: () => {}
            })
            this.$connectedTeamId = teamId
        } catch {
            this.$connectedTeamId = null
            this.$attachment = null
        }
    }

    protected async _disconnect (): Promise<void> {
        if (!this.$connectedTeamId) return
        const transport = this.$transport
        const attachment = this.$attachment
        this.$connectedTeamId = null
        this.$attachment = null
        this._onStopped()
        if (!transport || !attachment) return
        try {
            await transport.detach(attachment)
        } catch {
            // ignore teardown failures
        }
    }

    protected _onConnect (teamId: string, userId: string): void {
        this._onStarted(teamId, userId)
    }

    protected async _publish (topic: string, payload: MqttPayload, options?: Partial<TransportPublishOptions>): Promise<void> {
        const transport = this.$transport
        const teamId = this.$connectedTeamId
        if (!transport || !teamId) return
        await transport.publish(connectionKey(teamId), {
            topic,
            payload,
            qos: 2,
            ...options
        })
    }

    protected abstract _onStarted (teamId: string, userId: string): void

    protected abstract _onStopped (): void
}
