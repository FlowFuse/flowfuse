import { createApplicationsSubscriber } from './applications.subscriber'
import { createHostedInstancesSubscriber } from './hosted-instances.subscriber'
import { createLiveStatusSubscriber } from './live-status.subscriber'
import { createMcpInflightSubscriber } from './mcp-inflight.subscriber'
import { createMcpSessionSubscriber } from './mcp-session.subscriber'
import { createTeamChannelSubscriber } from './team-channel.subscriber'

/**
 * Every subscriber here is created once when the orchestrator boots and lives until the
 * app is disposed. Nothing in the component tree owns one, so a component unmounting -
 * a layout swap, say - cannot take a subscription down with it.
 *
 * `autoConnect` says whether a subscriber connects as soon as there is a team.
 * `false` marks one the user opts into: it is created with the rest but stays
 * disconnected until something asks for it, so a team load never quietly brings it up.
 * See ensureTeamChannelConnected() in stores/account.js, which acts on this.
 */
export default [
    { key: 'teamChannel' as const, create: createTeamChannelSubscriber, requiredLifecycle: ['destroy'] as const, autoConnect: true },
    { key: 'liveStatus' as const, create: createLiveStatusSubscriber, requiredLifecycle: ['destroy'] as const, autoConnect: true },
    { key: 'applications' as const, create: createApplicationsSubscriber, requiredLifecycle: ['destroy'] as const, autoConnect: true },
    { key: 'hostedInstances' as const, create: createHostedInstancesSubscriber, requiredLifecycle: ['destroy'] as const, autoConnect: true },
    // Exposing this tab to MCP clients is the user's call, never a side effect of loading a team
    { key: 'mcpInflight' as const, create: createMcpInflightSubscriber, requiredLifecycle: ['destroy'] as const, autoConnect: false },
    { key: 'mcpSession' as const, create: createMcpSessionSubscriber, requiredLifecycle: ['destroy'] as const, autoConnect: false }
]
