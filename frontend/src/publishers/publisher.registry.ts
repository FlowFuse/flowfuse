import { createTabPresencePublisher } from './tab-presence.publisher'

/**
 * Publishers follow the same rule as subscribers: created once at boot, disposed with
 * the app, never owned by a component.
 *
 * Tab presence is `autoConnect: false` because it announces this tab to MCP clients,
 * which only happens once the user has asked for it.
 */
export default [
    { key: 'tabPresence' as const, create: createTabPresencePublisher, requiredLifecycle: ['destroy'] as const, autoConnect: false }
]
