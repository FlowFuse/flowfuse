import type { Maybe } from '@/types/common/types'

/**
 * What an Expert chat subscriber and publisher need to know about the agent they serve:
 * its name, the channel segment of its topics and the store that holds its session.
 */
export interface ExpertChatChannel {
    agent: string
    channel: 'support' | 'insights'
    useAgentStore: () => { sessionId: Maybe<string>, mqttConnectionKey: string }
}
