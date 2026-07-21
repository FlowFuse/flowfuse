import { defineSubscriberSingleton } from './subscriber.factory'
import { SubscriberRoute, TeamSubscriber } from './team-subscriber.contract'

import { useLiveStatusStore } from '@/stores/live-status'
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
            useLiveStatusStore().setInstanceStatus(payload.id, payload.meta.state, payload.meta.versions)
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
