import { useAccountAuthStore, useContextStore, useProductExpertStore } from '@/stores'

interface EntityWithId {
    id: string
    [key: string]: unknown
}

interface EntityTopicPathsOptions {
    application?: EntityWithId | null
    instance?: EntityWithId | null
    device?: EntityWithId | null
    team?: EntityWithId | null
}

interface EntityTopicPaths {
    entityType: 'a' | 'p' | 'd' | 't'
    entityId: string | undefined
}

/**
 * Entity segment of a topic. The concrete forms address one application, instance,
 * device or team; `'+'` is the MQTT single-level wildcard, valid on a subscription only.
 */
type EntitySegment = EntityTopicPaths['entityType'] | '+'

type AgentChannel = 'support' | 'insights' | 'mcp'
type TopicType = 'chat' | 'inflight'
type TopicAction = 'response' | 'request'

interface ParsedTopic {
    topic: string
    isReply: boolean
    isInflightRequest: boolean
    sessionId: string
    entityType: string
    entityId: string
    agentChannel: 'support' | 'insights' | string
    topicType: string | 'chat' | 'inflight' | null
    topicAction: string | 'request' | 'response' | null
    inflightType: string | null
}

interface BuildTopicOptions {
    /**
     * Entity type segment. Pass `'+'` when subscribing, so one subscription covers every
     * entity the tab may be on: it changes as the user navigates, and a sender working
     * from a cached copy of the tab's context can lag behind a navigation. Publishing
     * always names a concrete entity.
     */
    entityType?: EntitySegment | null
    entityId?: string | null
    agentChannel?: AgentChannel
    topicType?: TopicType
    topicAction?: TopicAction,
    inflightType?: string | null
    sessionId?: string | null
}

export function useMqttExpertTopicHelper () {
    function getEntityTopicPaths (options?: EntityTopicPathsOptions): EntityTopicPaths {
        const { application, instance, device, team } = options ?? {}
        const contextStore = useContextStore()

        switch (true) {
        case !!instance || !!contextStore.instance:
            return {
                entityType: 'p',
                entityId: instance?.id ?? contextStore.instance.id
            }
        case !!device || !!contextStore.device:
            return {
                entityType: 'd',
                entityId: device?.id ?? contextStore.device?.id
            }
        case !!application || !!contextStore.application:
            return {
                entityType: 'a',
                entityId: application?.id ?? contextStore.application?.id
            }
        default:
            return {
                entityType: 't',
                entityId: team?.id ?? contextStore.team?.id
            }
        }
    }

    function buildTopic (options?: BuildTopicOptions): string {
        const { entityType, entityId, agentChannel, topicType, topicAction, inflightType, sessionId: sessionIdOverride } = options ?? {}

        if (!entityType) throw new Error('Topic "entityType" is mandatory')
        if (!entityId) throw new Error('Topic "entityId" is mandatory')
        if (!agentChannel || !['support', 'insights', 'mcp'].includes(agentChannel)) {
            throw new Error(`"agentChannel" must be one of "support", "insights" or "mcp", "${agentChannel}" given`)
        }
        if (!topicType || !['chat', 'inflight'].includes(topicType)) {
            throw new Error(`"topicType" must be either "chat" or "inflight", "${topicType}" given`)
        }
        if (!topicAction || !['response', 'request'].includes(topicAction)) {
            throw new Error(`"topicAction" must be either "response" or "request", "${topicAction}" given`)
        }

        const authStore = useAccountAuthStore()
        const expertStore = useProductExpertStore()

        const sessionId = sessionIdOverride ?? expertStore.sessionId

        return [
            'ff',
            'v1',
            'expert',
            authStore.user.id,
            sessionId,
            entityType,
            entityId,
            agentChannel,
            topicType,
            inflightType,
            topicAction
        ]
            .filter(str => str).join('/')
    }

    function parseTopic (topic: string): ParsedTopic {
        // topic examples
        // ff/v1/expert/<userId>/<sessionId>/<entityType>/<entityId>/<agentChannel>/<topicType>/<topicAction>
        // ff/v1/expert/<userId>/<sessionId>/<entityType>/<entityId>/<agentChannel>/<topicType>/<tool>/<topicAction>

        if (!topic || topic.length === 0) throw new Error(`Invalid topic received: "${topic}"`)

        const split = topic.split('/')

        const inflightRequest = topic.includes('/inflight/') && topic.endsWith('/request')
        return {
            topic,
            isReply: topic.endsWith('/response'),
            isInflightRequest: inflightRequest,
            sessionId: split[4],
            entityType: split[5],
            entityId: split[6],
            agentChannel: split[7],
            topicType: split[8],
            topicAction: split.at(-1),
            inflightType: inflightRequest ? split.at(-2) ?? null : null
        }
    }

    return {
        getEntityTopicPaths,
        buildTopic,
        parseTopic
    }
}
