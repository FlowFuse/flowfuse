import type { App } from 'vue'
import type { Router } from 'vue-router'

import type { TeamRef } from '@/types/subscribers/subscriber.types'
import type { Transport } from '@/types/transport/transport.types'

export interface Publisher {
    init?: () => (void | Promise<void>)
    destroy?: () => (void | Promise<void>)
}

export interface TeamPublisherI extends Publisher {
    connect(team: TeamRef | null | undefined): Promise<void>
    disconnect(): Promise<void>
    destroy(): Promise<void>
    isConnected(): boolean
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type PublisherInstances = {
    // concrete publishers added here as needed
}

export interface CreatePublisherOptions<TTransport extends Transport = Transport> {
    app: App
    router: Router
    transport: TTransport
}
