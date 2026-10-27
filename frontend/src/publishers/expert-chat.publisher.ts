import { definePublisherSingleton } from './publisher.factory'
import { TeamPublisher } from './team-publisher.contract'

import userApi from '@/api/user.js'
import { useMqttExpertTopicHelper } from '@/composables/services/MqttExpertTopicHelper'
import { useContextStore } from '@/stores/context.js'
import { SUPPORT_AGENT } from '@/stores/product-expert-agents.js'
import { useProductExpertSupportAgentStore } from '@/stores/product-expert-support-agent.js'
import { Maybe } from '@/types/common/types'
import type { CreatePublisherOptions, ExpertChatPublisherI, InflightResponse } from '@/types/publishers/publisher.types'
import type { MqttPayload } from '@/types/services/mqtt.types'
import type { TeamRef } from '@/types/subscribers/subscriber.types'
import type { TransportPublishOptions } from '@/types/transport/transport.types'

interface ExpertChatChannel {
    agent: string
    channel: 'support' | 'insights'
    useAgentStore: () => { sessionId: Maybe<string>, mqttConnectionKey: string }
}

/**
 * Sends one agent's chat: requests, aborts, votes and system notices, and the answers to
 * the in-flight requests the agent makes while a turn runs. It shares the agent's
 * connection with the Expert chat subscriber, which attaches first so the replies have
 * somewhere to land, and keeps the session it connected with in the same way.
 */
abstract class ExpertChatPublisher extends TeamPublisher implements ExpertChatPublisherI {
    protected $channel: ExpertChatChannel

    protected $sessionId: Maybe<string> = null

    protected $linkUp = false

    protected constructor (options: CreatePublisherOptions, name: string, channel: ExpertChatChannel) {
        super({ name, ...options })
        this.$channel = channel
    }

    /**
     * Whether a message sent now would go out. An abort is only worth sending while it is,
     * since nothing waits for it.
     */
    isLinkUp (): boolean {
        return this.$linkUp
    }

    async request (body: Record<string, unknown>, transactionId: string): Promise<void> {
        const topicHelper = useMqttExpertTopicHelper()
        const { entityId, entityType } = topicHelper.getEntityTopicPaths()

        const topic = topicHelper.buildTopic({
            entityType,
            entityId,
            agentChannel: this.$channel.channel,
            topicType: 'chat',
            topicAction: 'request',
            sessionId: this.$sessionId
        })

        await this._send(topic, { ...body, context: this._context() }, {
            correlationData: transactionId,
            userProperties: {
                ...(this.$sessionId && { sessionId: this.$sessionId }),
                origin: window.origin || window.location.origin
            }
        })
    }

    abort (transactionId: string): Promise<void> {
        return this.request({ abort: true }, transactionId)
    }

    async respond (topic: string, { body, transactionId, sessionId, chatTransactionId }: InflightResponse): Promise<void> {
        await this._send(topic, JSON.stringify(body), {
            correlationData: transactionId,
            userProperties: {
                ...(sessionId && { sessionId }),
                ...(chatTransactionId && { transactionId: chatTransactionId }),
                origin: window.origin || window.location.origin
            }
        })
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

    protected _context (): Record<string, unknown> {
        return {
            ...useContextStore().expert,
            agent: this.$channel.agent
        }
    }

    protected _onStarted (): void {
        this.$linkUp = true
    }

    protected _onStopped (): void {
        this.$linkUp = false
    }

    protected _onLinkDown (): void {
        this.$linkUp = false
    }

    // _publish drops a message quietly when there is no connection, but a chat send has to
    // fail so the turn is not left waiting on a reply that cannot come
    private async _send (topic: string, payload: MqttPayload, options: Partial<TransportPublishOptions>): Promise<void> {
        if (!this.isConnected()) {
            throw new Error(`[${this.$name}] not connected`)
        }
        await this._publish(topic, payload, options)
    }
}

class SupportChatPublisher extends ExpertChatPublisher {
    constructor (options: CreatePublisherOptions) {
        super(options, 'expertSupportChat', {
            agent: SUPPORT_AGENT,
            channel: 'support',
            useAgentStore: useProductExpertSupportAgentStore
        })
    }
}

const { create: createSupportChatPublisher, destroy: destroySupportChatPublisher } = definePublisherSingleton(SupportChatPublisher)

export { ExpertChatPublisher, createSupportChatPublisher, destroySupportChatPublisher }

export default createSupportChatPublisher
