import { defineSubscriberSingleton } from './subscriber.factory'
import { SubscriberRoute, TeamSubscriber } from './team-subscriber.contract'

import { useDataFarmApplicationsStore } from '@/stores/data-farm-applications'
import type { ApplicationSummary } from '@/types'
import type { CreateSubscriberOptions, TeamSubscriberI } from '@/types/subscribers/subscriber.types'

const APPLICATION_LIFECYCLE_TOPIC_REGEX = /^ff\/v1\/[^/]+\/a\/[^/]+\/(?:created|updated|deleted)$/

class ApplicationsSubscriber extends TeamSubscriber implements TeamSubscriberI {
    constructor ({ app, router, transport, subscribers }: CreateSubscriberOptions) {
        super({
            name: 'applications',
            app,
            router,
            transport,
            subscribers
        })
    }

    protected _topics (teamId: string): string[] {
        return [
            `ff/v1/${teamId}/a/+/created`,
            `ff/v1/${teamId}/a/+/updated`,
            `ff/v1/${teamId}/a/+/deleted`
        ]
    }

    protected _routes (): SubscriberRoute[] {
        return [
            { pattern: APPLICATION_LIFECYCLE_TOPIC_REGEX, handle: (payload) => this._onLifecycle(payload) }
        ]
    }

    protected _onLifecycle (payload: { id?: string, action?: string, data?: ApplicationSummary }): void {
        if (!payload?.id || !payload.action) return
        try {
            useDataFarmApplicationsStore().applyRealtimeEvent(payload)
        } catch {}
    }
}

const { create: createApplicationsSubscriber, destroy: destroyApplicationsSubscriber } = defineSubscriberSingleton(ApplicationsSubscriber)

export { createApplicationsSubscriber, destroyApplicationsSubscriber }

export default createApplicationsSubscriber
