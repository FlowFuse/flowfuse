import { defineSubscriberSingleton } from './subscriber.factory'
import { SubscriberRoute, TeamSubscriber } from './team-subscriber.contract'

import { useContextStore } from '@/stores/context.js'
import { useLiveStatusStore } from '@/stores/live-status'
import { useProductExpertStore } from '@/stores/product-expert.js'
import type { CreateSubscriberOptions, TeamSubscriberI } from '@/types/subscribers/subscriber.types'

const DEVICE_STATE_TOPIC_REGEX = /^ff\/v1\/[^/]+\/d\/[^/]+\/state$/
const INSTANCE_STATE_TOPIC_REGEX = /^ff\/v1\/[^/]+\/p\/[^/]+\/state$/

class LiveStatusSubscriber extends TeamSubscriber implements TeamSubscriberI {
    constructor ({ app, router, transport, subscribers }: CreateSubscriberOptions) {
        super({
            name: 'liveStatus',
            app,
            router,
            transport,
            subscribers
        })
    }

    protected _topics (teamId: string): string[] {
        return [
            `ff/v1/${teamId}/p/+/state`,
            `ff/v1/${teamId}/d/+/state`
        ]
    }

    protected _routes (): SubscriberRoute[] {
        return [
            { pattern: DEVICE_STATE_TOPIC_REGEX, handle: (payload) => this._onDeviceStatus(payload) },
            { pattern: INSTANCE_STATE_TOPIC_REGEX, handle: (payload) => this._onInstanceStatus(payload) }
        ]
    }

    protected _onSubscribed (): void {
        try {
            useLiveStatusStore().setLive(true)
        } catch {}
    }

    protected _onDisconnected (): void {
        try {
            useLiveStatusStore().clear()
        } catch {}
    }

    protected _onInstanceStatus (payload: { id?: string, meta?: { state?: string, versions?: Record<string, string> } }): void {
        if (!payload?.id || !payload.meta?.state) return
        try {
            const transitionedToRunning = useLiveStatusStore().setInstanceStatus(payload.id, payload.meta.state, payload.meta.versions)
            if (transitionedToRunning) this._onInstanceRunning(payload.id)
        } catch {}
    }

    // The state payload carries no instance name; fall back to whatever the currently
    // loaded instance context already knows rather than making a fresh API call for it.
    protected _onInstanceRunning (id: string): void {
        try {
            const instance = useContextStore().instance
            const name = instance?.id === id ? instance.name : null
            useProductExpertStore().relayInstanceReady({ id, name }).catch(() => undefined)
        } catch {}
    }

    protected _onDeviceStatus (payload: { id?: string, meta?: { state?: string, onlineStatus?: string } }): void {
        if (!payload?.id || !payload.meta?.state) return
        try {
            useLiveStatusStore().setDeviceStatus(payload.id, payload.meta.state, payload.meta.onlineStatus)
        } catch {}
    }
}

const { create: createLiveStatusSubscriber, destroy: destroyLiveStatusSubscriber } = defineSubscriberSingleton(LiveStatusSubscriber)

export { createLiveStatusSubscriber, destroyLiveStatusSubscriber }

export default createLiveStatusSubscriber
