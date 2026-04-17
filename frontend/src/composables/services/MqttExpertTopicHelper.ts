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

type AgentChannel = 'support' | 'insights'
type TopicType = 'chat' | 'inflight'
type TopicAction = 'response' | 'request'

interface DestructuredTopic {
    topic: string
    isReply: boolean
    isInflightRequest: boolean
    entityType: string
    entityId: string
    automation: string | null
}

interface TopicBuilderOptions {
    entityType?: EntityTopicPaths['entityType'] | null
    entityId?: string | null
    agentChannel?: AgentChannel
    topicType?: TopicType
    topicAction?: TopicAction
}

export function useMqttExpertTopicHelper () {
    function getEntityTopicPaths (options?: EntityTopicPathsOptions): EntityTopicPaths {
        const { application, instance, device, team } = options ?? {}
        const contextStore = useContextStore()

        switch (true) {
        case !!application || !!contextStore.application:
            return {
                entityType: 'a',
                entityId: application?.id ?? contextStore.application?.id
            }
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
        default:
            return {
                entityType: 't',
                entityId: team?.id ?? contextStore.team?.id
            }
        }
    }

    function topicBuilder (options?: TopicBuilderOptions): string {
        const { entityType, entityId, agentChannel, topicType, topicAction } = options ?? {}

        if (!entityType) throw new Error('Topic "entityType" is mandatory')
        if (!entityId) throw new Error('Topic "entityId" is mandatory')
        if (!agentChannel || !['support', 'insights'].includes(agentChannel)) {
            throw new Error(`"agentChannel" must be either "support" or "insights", "${agentChannel}" given`)
        }
        if (!topicType || !['chat', 'inflight'].includes(topicType)) {
            throw new Error(`"topicType" must be either "chat" or "inflight", "${topicType}" given`)
        }
        if (!topicAction || !['response', 'request'].includes(topicAction)) {
            throw new Error(`"topicAction" must be either "response" or "request", "${topicAction}" given`)
        }

        const authStore = useAccountAuthStore()
        const expertStore = useProductExpertStore()

        const sessionId = expertStore.sessionId

        return `ff/v1/expert/${authStore.user.id}/${sessionId}/${entityType}/${entityId}/${agentChannel}/${topicType}/${topicAction}`
    }

    function destructureTopic (topic: string): DestructuredTopic {
        if (!topic || topic.length === 0) throw new Error(`Invalid topic received: "${topic}"`)

        const split = topic.split('/')

        const inflightRequest = topic.includes('/inflight/') && topic.endsWith('/request')

        return {
            topic,
            isReply: topic.endsWith('/response'),
            isInflightRequest: inflightRequest,
            entityType: split[5],
            entityId: split[6],
            automation: inflightRequest ? split.at(-2) ?? null : null
        }
    }

    return {
        getEntityTopicPaths,
        topicBuilder,
        destructureTopic
    }
}
