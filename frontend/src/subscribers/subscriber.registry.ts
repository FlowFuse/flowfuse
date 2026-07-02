import { createTeamChannelSubscriber } from './team-channel.subscriber'

export default [
    { key: 'teamChannel' as const, create: createTeamChannelSubscriber, requiredLifecycle: ['destroy'] as const }
]
