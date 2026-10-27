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

export interface TabPresencePublisherI extends TeamPublisherI {
    /**
     * Publish a heartbeat now rather than waiting out the interval. Callers use it
     * whenever something has just changed what the platform should know about this tab.
     */
    announcePresence(): void
}

/**
 * The answer to one in-flight request, echoing its correlation id and the chat turn
 * it belongs to.
 */
export interface InflightResponse {
    body: unknown
    transactionId: string | null
    sessionId: string | null
    chatTransactionId: string | null
}

export interface ExpertChatPublisherI extends TeamPublisherI {
    isLinkUp(): boolean
    request(body: Record<string, unknown>, transactionId: string): Promise<void>
    abort(transactionId: string): Promise<void>
    respond(topic: string, response: InflightResponse): Promise<void>
}

export type PublisherInstances = {
    tabPresence: TabPresencePublisherI | null
    expertSupportChat: ExpertChatPublisherI | null
    expertInsightsChat: ExpertChatPublisherI | null
}

export interface CreatePublisherOptions<TTransport extends Transport = Transport> {
    app: App
    router: Router
    transport: TTransport
}
