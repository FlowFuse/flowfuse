import { defineSubscriberSingleton } from './subscriber.factory'
import { SubscriberRoute, TeamSubscriber } from './team-subscriber.contract'

import { useDataFarmHostedInstancesStore } from '@/stores/data-farm-hosted-instances'
import type { InstanceSummary } from '@/types'
import type { CreateSubscriberOptions, TeamSubscriberI } from '@/types/subscribers/subscriber.types'

const INSTANCE_LIFECYCLE_TOPIC_REGEX = /^ff\/v1\/[^/]+\/p\/[^/]+\/(?:created|updated|deleted)$/

class HostedInstancesSubscriber extends TeamSubscriber implements TeamSubscriberI {
    constructor ({ app, router, transport, subscribers }: CreateSubscriberOptions) {
        super({
            name: 'hostedInstances',
            app,
            router,
            transport,
            subscribers
        })
    }

    protected _topics (teamId: string): string[] {
        return [
            `ff/v1/${teamId}/p/+/created`,
            `ff/v1/${teamId}/p/+/updated`,
            `ff/v1/${teamId}/p/+/deleted`
        ]
    }

    protected _routes (): SubscriberRoute[] {
        return [
            { pattern: INSTANCE_LIFECYCLE_TOPIC_REGEX, handle: (payload) => this._onLifecycle(payload) }
        ]
    }

    protected _onLifecycle (payload: { id?: string, action?: string, data?: InstanceSummary }): void {
        if (!payload?.id || !payload.action) return
        try {
            useDataFarmHostedInstancesStore().applyRealtimeEvent(payload)
        } catch {}
    }
}

const { create: createHostedInstancesSubscriber, destroy: destroyHostedInstancesSubscriber } = defineSubscriberSingleton(HostedInstancesSubscriber)

export { createHostedInstancesSubscriber, destroyHostedInstancesSubscriber }

export default createHostedInstancesSubscriber
