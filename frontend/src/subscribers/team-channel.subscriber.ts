import { defineSubscriberSingleton } from './subscriber.factory'
import { SubscriberRoute, TeamSubscriber } from './team-subscriber.contract'

import { useContextStore } from '@/stores/context.js'
import type { CreateSubscriberOptions, TeamSubscriberI } from '@/types/subscribers/subscriber.types'

const MEMBERSHIP_TOPIC_REGEX = /^ff\/v1\/[^/]+\/u\/([^/]+)\/membership$/
const TEAM_UPDATED_TOPIC_REGEX = /^ff\/v1\/[^/]+\/t\/updated$/

class TeamChannelSubscriber extends TeamSubscriber implements TeamSubscriberI {
    constructor ({ app, router, transport, subscribers }: CreateSubscriberOptions) {
        super({
            name: 'teamChannel',
            app,
            router,
            transport,
            subscribers
        })
    }

    protected _topics (teamId: string, userId: string): string[] {
        return [
            `ff/v1/${teamId}/t/updated`,
            `ff/v1/${teamId}/u/${userId}/membership`
        ]
    }

    protected _routes (): SubscriberRoute[] {
        return [
            { pattern: MEMBERSHIP_TOPIC_REGEX, handle: (payload) => this._onMembership(payload) },
            { pattern: TEAM_UPDATED_TOPIC_REGEX, handle: () => this._onTeamUpdated() }
        ]
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

const { create: createTeamChannelSubscriber, destroy: destroyTeamChannelSubscriber } = defineSubscriberSingleton(TeamChannelSubscriber)

export { createTeamChannelSubscriber, destroyTeamChannelSubscriber }

export default createTeamChannelSubscriber
