import { defineSubscriberSingleton } from './subscriber.factory'
import { SubscriberRoute, TeamSubscriber } from './team-subscriber.contract'

import { useMqttExpertTopicHelper } from '@/composables/services/MqttExpertTopicHelper'
import { useAccountAuthStore } from '@/stores/account-auth.js'
import { useProductExpertStore } from '@/stores/product-expert.js'
import type { CreateSubscriberOptions, TeamSubscriberI } from '@/types/subscribers/subscriber.types'
import type { TransportMessagePacket, TransportSubscribeOptions } from '@/types/transport/transport.types'

const INFLIGHT_CHANNEL = 'mcp'

const MCP_INFLIGHT_TOPIC_REGEX = new RegExp(`^ff/v1/expert/[^/]+/[^/]+/[^/]+/[^/]+/${INFLIGHT_CHANNEL}/inflight/[^/]+/request$`)

/**
 * Listens for in-flight requests sent by third-party MCP agents.
 *
 * These arrive on the same topic shape the expert chat client uses, addressed to this
 * tab's browser session rather than a chat session. They ride the team connection
 * because that is the one the MCP toggle already brings up -
 * the expert client only exists once the user has started a chat, so nothing would be
 * listening otherwise.
 *
 * The session segment is this tab's own id, so no wildcard is needed there and one tab
 * cannot pick up another tab's work. The entity pair is wildcarded so navigating around
 * the app does not require resubscribing.
 */
class McpInflightSubscriber extends TeamSubscriber implements TeamSubscriberI {
    constructor ({ app, router, transport, subscribers }: CreateSubscriberOptions) {
        super({
            name: 'mcpInflight',
            app,
            router,
            transport,
            subscribers
        })
    }

    protected _topics (): string[] {
        const authStore = useAccountAuthStore()
        const topicHelper = useMqttExpertTopicHelper()

        return [
            topicHelper.buildTopic({
                entityType: '+',
                entityId: '+',
                agentChannel: INFLIGHT_CHANNEL,
                topicType: 'inflight',
                topicAction: 'request',
                inflightType: '+',
                sessionId: authStore.getSessionId()
            })
        ]
    }

    // in-flight traffic is exactly-once on the expert client; match it here
    protected _subscribeOptions (): TransportSubscribeOptions {
        return { qos: 2 }
    }

    protected _routes (): SubscriberRoute[] {
        return [
            {
                pattern: MCP_INFLIGHT_TOPIC_REGEX,
                handle: (payload, topic, packet) => this._onInflightRequest(payload, topic, packet)
            }
        ]
    }

    private _onInflightRequest (payload: unknown, topic: string, packet?: TransportMessagePacket): void {
        const topicHelper = useMqttExpertTopicHelper()
        const expertStore = useProductExpertStore()

        const correlationData = packet?.properties?.correlationData
        const transactionId = correlationData
            ? new TextDecoder().decode(correlationData)
            : null

        // The session to answer on comes from the topic, not from a user property: a
        // third-party caller is not required to set one.
        const { sessionId } = topicHelper.parseTopic(topic)

        expertStore.handleInFlightRequest({
            topic,
            payload,
            transactionId,
            sessionId,
            chatTransactionId: packet?.properties?.userProperties?.transactionId ?? null
        })
    }
}

const { create: createMcpInflightSubscriber, destroy: destroyMcpInflightSubscriber } = defineSubscriberSingleton(McpInflightSubscriber)

export { createMcpInflightSubscriber, destroyMcpInflightSubscriber }

export default createMcpInflightSubscriber
