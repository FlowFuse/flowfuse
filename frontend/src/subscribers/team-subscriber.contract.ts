import type { App } from 'vue'
import type { Router } from 'vue-router'

import teamApi from '@/api/team.js'
import { useAccountAuthStore } from '@/stores/account-auth.js'
import { Maybe } from '@/types/common/types'
import type { CreateSubscriberOptions, SubscriberInstances, TeamRef } from '@/types/subscribers/subscriber.types'
import type { Transport, TransportAttachmentHandle, TransportMessagePacket, TransportSubscribeOptions } from '@/types/transport/transport.types'

export function connectionKey (teamId: string): string {
    return `team:${teamId}`
}

/**
 * Whatever JSON.parse produced from the message body. The named fields are what current
 * routes happen to read, not a closed set - the index signature says so, and is
 * load-bearing: without it this is a weak type and TS rejects any handler sharing none of
 * those names. Values are `unknown` so a route has to check for a shape, not assert it.
 */
export type SubscriberPayload = {
    reason?: string
    id?: string
    meta?: { state?: string }
    [key: string]: unknown
}

export interface SubscriberRoute {
    pattern: RegExp
    /**
     * `topic` and `packet` are passed for routes that need to reply: the topic carries
     * the session and entity to answer on, the packet the correlation id to echo.
     */
    handle: (payload: SubscriberPayload, topic: string, packet?: TransportMessagePacket) => void
}

export abstract class TeamSubscriber<TTransport extends Transport = Transport> {
    protected $name: string

    protected $app: Maybe<App> = null

    protected $router: Maybe<Router> = null

    protected $transport: Maybe<TTransport> = null

    protected $subscribers: Maybe<SubscriberInstances> = null

    protected $connectedTeamId: Maybe<string> = null

    protected $attachment: Maybe<TransportAttachmentHandle> = null

    protected $operation: Maybe<Promise<unknown>> = null

    protected constructor ({
        name,
        app,
        router,
        transport,
        subscribers
    }: { name: string } & CreateSubscriberOptions<TTransport>) {
        this.$name = name
        this.$app = app
        this.$router = router
        this.$transport = transport
        this.$subscribers = subscribers ?? null
    }

    init () {
        return undefined
    }

    isConnected (): boolean {
        return this.$connectedTeamId !== null
    }

    async connect (team: Maybe<TeamRef>): Promise<void> {
        await this.runSubscriberOperation(() => this._connect(team))
    }

    async disconnect (): Promise<void> {
        await this.runSubscriberOperation(() => this._disconnect())
    }

    async destroy (): Promise<void> {
        await this.disconnect()
    }

    async runSubscriberOperation<T> (operation: () => Promise<T> | T): Promise<T> {
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
                onMessage: (topic, message, packet) => this._onMessage(topic, message, packet),
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
        if (!transport || !attachment) return
        try {
            await transport.detach(attachment)
            this._onDisconnected()
        } catch {
            // ignore teardown failures
        }
    }

    protected async _onConnect (teamId: string, userId: string): Promise<void> {
        const transport = this.$transport
        if (!transport) return
        try {
            await transport.subscribe(connectionKey(teamId), this._topics(teamId, userId), this._subscribeOptions())
            this._onSubscribed()
        } catch {
            // non-fatal — the transport replays subscriptions on reconnect
        }
    }

    protected _onMessage (topic: string, message: Buffer | Uint8Array | string, packet?: TransportMessagePacket): void {
        let payload: SubscriberPayload = {}
        try {
            const raw = typeof message === 'string'
                ? message
                : (message?.toString ? message.toString() : '')
            payload = raw ? JSON.parse(raw) : {}
        } catch {
            payload = {}
        }

        for (const { pattern, handle } of this._routes()) {
            if (pattern.test(topic)) {
                handle(payload, topic, packet)
                return
            }
        }
    }

    protected _subscribeOptions (): TransportSubscribeOptions {
        return { qos: 1 }
    }

    protected abstract _topics (teamId: string, userId: string): string[]

    protected abstract _routes (): SubscriberRoute[]

    protected _onSubscribed (): void {}

    protected _onDisconnected (): void {}
}
