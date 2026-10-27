import { defineSubscriberSingleton } from './subscriber.factory'
import { SubscriberPayload, SubscriberRoute, TeamSubscriber } from './team-subscriber.contract'

import userApi from '@/api/user.js'
import { useMqttExpertTopicHelper } from '@/composables/services/MqttExpertTopicHelper'
import { INSIGHTS_AGENT, SUPPORT_AGENT } from '@/stores/product-expert-agents.js'
import { useProductExpertInsightsAgentStore } from '@/stores/product-expert-insights-agent.js'
import { useProductExpertSupportAgentStore } from '@/stores/product-expert-support-agent.js'
import { useProductExpertStore } from '@/stores/product-expert.js'
import { Maybe } from '@/types/common/types'
import type { CreateSubscriberOptions, TeamRef, TeamSubscriberI } from '@/types/subscribers/subscriber.types'
import type { TransportError, TransportMessagePacket, TransportReasonPacket, TransportSubscribeOptions } from '@/types/transport/transport.types'

interface ExpertChatChannel {
    agent: string
    channel: 'support' | 'insights'
    useAgentStore: () => { sessionId: Maybe<string>, mqttConnectionKey: string }
}

function decodeCorrelation (packet?: TransportMessagePacket): Maybe<string> {
    const correlationData = packet?.properties?.correlationData
    return correlationData ? new TextDecoder().decode(correlationData) : null
}

function userProperty (packet: TransportMessagePacket | undefined, name: string): Maybe<string> {
    return (packet?.properties?.userProperties?.[name] as string | undefined) ?? null
}

/**
 * Receives one agent's chat: its replies and the in-flight requests it sends while a turn
 * runs. Each agent has a connection of its own, made with Expert chat credentials for the
 * agent's session rather than the team's, so it lives on the agent's key instead of the
 * team connection.
 *
 * The subscriber connects when the agent first sends and keeps the session it connected
 * with across reconnects, so the agent's subscriptions survive the user switching to the
 * other agent. A new chat disconnects it first. Messages reach the store tagged with the
 * agent, so a reply that lands after the user switched away still goes to its own chat.
 */
abstract class ExpertChatSubscriber extends TeamSubscriber implements TeamSubscriberI {
    protected $channel: ExpertChatChannel

    protected $sessionId: Maybe<string> = null

    protected constructor (options: CreateSubscriberOptions, name: string, channel: ExpertChatChannel) {
        super({ name, ...options })
        this.$channel = channel
    }

    protected async _connect (team: Maybe<TeamRef>): Promise<void> {
        if (this.isConnected()) return
        this.$sessionId = this.$channel.useAgentStore().sessionId
        await super._connect(team)
    }

    protected _connectionKey (): string {
        return this.$channel.useAgentStore().mqttConnectionKey
    }

    protected _getCredentials (): Promise<unknown> {
        return userApi.initiateExpertChat({ sessionId: this.$sessionId })
    }

    protected _topics (): string[] {
        const topicHelper = useMqttExpertTopicHelper()
        const subscription = {
            entityType: '+' as const,
            entityId: '+',
            agentChannel: this.$channel.channel,
            sessionId: this.$sessionId
        }

        return [
            topicHelper.buildTopic({ ...subscription, topicType: 'chat', topicAction: 'response' }),
            topicHelper.buildTopic({ ...subscription, topicType: 'inflight', topicAction: 'request', inflightType: '+' })
        ]
    }

    // chat traffic is exactly-once on the Expert side
    protected _subscribeOptions (): TransportSubscribeOptions {
        return { qos: 2 }
    }

    protected _routes (): SubscriberRoute[] {
        const channel = this.$channel.channel

        return [
            {
                pattern: new RegExp(`^ff/v1/expert/[^/]+/[^/]+/[^/]+/[^/]+/${channel}/chat/response$`),
                handle: (payload, topic, packet) => this._onReply(payload, packet)
            },
            {
                pattern: new RegExp(`^ff/v1/expert/[^/]+/[^/]+/[^/]+/[^/]+/${channel}/inflight/[^/]+/request$`),
                handle: (payload, topic, packet) => this._onInflightRequest(payload, topic, packet)
            }
        ]
    }

    protected async _onConnect (teamId: string, userId: string, connack?: TransportReasonPacket): Promise<void> {
        // mqtt.js usually reports a refused connection as an error instead, but guard anyway
        if (connack?.reasonCode && connack.reasonCode >= 0x80) {
            useProductExpertStore().handleMqttError(connack.reasonCode, connack.properties?.reasonString, this.$channel.agent)
            return
        }

        const transport = this.$transport
        if (!transport) return
        try {
            await transport.subscribe(this._connectionKey(), this._topics(), this._subscribeOptions())
        } catch (error) {
            this._onError(error instanceof Error ? error : new Error(String(error)))
            return
        }

        useProductExpertStore().onChatConnected(this.$channel.agent)
    }

    protected _onClose (): void {
        useProductExpertStore().onChatConnectionClosed(this.$channel.agent)
    }

    protected _onOffline (): void {
        console.warn(`[${this.$name}] connection offline`)
    }

    protected _onDisconnect (packet?: TransportReasonPacket): void {
        useProductExpertStore().handleMqttError(packet?.reasonCode, packet?.properties?.reasonString, this.$channel.agent)
    }

    protected _onError (failure: TransportError): void {
        useProductExpertStore().handleMqttError(failure.code, failure.message, this.$channel.agent)
    }

    private _onReply (payload: SubscriberPayload, packet?: TransportMessagePacket): void {
        useProductExpertStore()
            .receiveChatReply({ agent: this.$channel.agent, transactionId: decodeCorrelation(packet), payload })
            .catch((error: unknown) => console.warn(`[${this.$name}] chat reply failed:`, error))
    }

    private _onInflightRequest (payload: SubscriberPayload, topic: string, packet?: TransportMessagePacket): void {
        useProductExpertStore()
            .receiveChatInflight({
                agent: this.$channel.agent,
                topic,
                payload,
                transactionId: decodeCorrelation(packet),
                sessionId: userProperty(packet, 'sessionId'),
                chatTransactionId: userProperty(packet, 'transactionId')
            })
            .catch((error: unknown) => console.warn(`[${this.$name}] in-flight request failed:`, error))
    }
}

class SupportChatSubscriber extends ExpertChatSubscriber {
    constructor (options: CreateSubscriberOptions) {
        super(options, 'expertSupportChat', {
            agent: SUPPORT_AGENT,
            channel: 'support',
            useAgentStore: useProductExpertSupportAgentStore
        })
    }
}

class InsightsChatSubscriber extends ExpertChatSubscriber {
    constructor (options: CreateSubscriberOptions) {
        super(options, 'expertInsightsChat', {
            agent: INSIGHTS_AGENT,
            channel: 'insights',
            useAgentStore: useProductExpertInsightsAgentStore
        })
    }
}

const { create: createSupportChatSubscriber, destroy: destroySupportChatSubscriber } = defineSubscriberSingleton(SupportChatSubscriber)
const { create: createInsightsChatSubscriber, destroy: destroyInsightsChatSubscriber } = defineSubscriberSingleton(InsightsChatSubscriber)

export {
    ExpertChatSubscriber,
    createSupportChatSubscriber,
    destroySupportChatSubscriber,
    createInsightsChatSubscriber,
    destroyInsightsChatSubscriber
}

export default createSupportChatSubscriber
