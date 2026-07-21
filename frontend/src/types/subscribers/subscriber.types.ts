import type { App } from 'vue'
import type { Router } from 'vue-router'

import type { Transport } from '@/types/transport/transport.types'

export interface TeamRef {
    id: string
}

export interface Subscriber {
    init?: () => (void | Promise<void>)
    destroy?: () => (void | Promise<void>)
}

export interface TeamSubscriberI extends Subscriber {
    connect(team: TeamRef | null | undefined): Promise<void>
    disconnect(): Promise<void>
    destroy(): Promise<void>
    isConnected(): boolean
}

export type SubscriberInstances = {
    teamChannel: TeamSubscriberI | null
    liveStatus: TeamSubscriberI | null
}

export interface CreateSubscriberOptions<TTransport extends Transport = Transport> {
    app: App
    router: Router
    transport: TTransport
    subscribers?: SubscriberInstances
}
