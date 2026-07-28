import { createLiveStatusSubscriber } from './live-status.subscriber'
import { createTeamChannelSubscriber } from './team-channel.subscriber'

export default [
    { key: 'teamChannel' as const, create: createTeamChannelSubscriber, requiredLifecycle: ['destroy'] as const },
    { key: 'liveStatus' as const, create: createLiveStatusSubscriber, requiredLifecycle: ['destroy'] as const }
]
