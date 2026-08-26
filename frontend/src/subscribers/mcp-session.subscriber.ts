import { defineSubscriberSingleton } from './subscriber.factory'
import { SubscriberPayload, SubscriberRoute, TeamSubscriber } from './team-subscriber.contract'

import getAppOrchestrator from '@/services/app.orchestrator'
import { useAccountAuthStore } from '@/stores/account-auth.js'
import { useProductMcpStore } from '@/stores/product-mcp.js'
import { createMqttTransport } from '@/transport/mqtt.transport'
import type { CreateSubscriberOptions, TeamRef, TeamSubscriberI } from '@/types/subscribers/subscriber.types'

/**
 * Pinned to this tab's own session rather than wildcarding it, so an event meant
 * for another of the user's tabs is ignored even if one ever reaches this client.
 */
function sessionEventPattern (sessionId: string, event: string): RegExp {
    const session = sessionId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return new RegExp(`^ff/v1/[^/]+/u/[^/]+/s/${session}/mcp/${event}$`)
}

/**
 * Listens for what the platform says is targeting this tab over MCP.
 *
 * Exposing a tab and an MCP client actually targeting it are two different things:
 * the toggle only does the first. `clients` is the second, and it carries the whole
 * set rather than a flag, because targeting is not exclusive - several MCP clients
 * can drive one tab at once.
 *
 * The platform republishes the full set on every presence heartbeat, and again the
 * moment a pin is made or moved. That means a pin that ends by quietly expiring
 * still corrects itself, without the tab having to infer anything locally.
 *
 * The topic is the tab's own session, and the broker ACL pins that segment to
 * this connection's credential, so a tab only ever hears about itself. It rides
 * the team connection because that is the one the toggle already brings up.
 */
class McpSessionSubscriber extends TeamSubscriber implements TeamSubscriberI {
    constructor ({ app, router, transport, subscribers }: CreateSubscriberOptions) {
        super({
            name: 'mcpSession',
            app,
            router,
            transport,
            subscribers
        })
    }

    protected _topics (teamId: string, userId: string): string[] {
        const authStore = useAccountAuthStore()

        return [
            `ff/v1/${teamId}/u/${userId}/s/${authStore.getSessionId()}/mcp/+`
        ]
    }

    protected _routes (): SubscriberRoute[] {
        const sessionId = useAccountAuthStore().getSessionId()

        return [
            {
                pattern: sessionEventPattern(sessionId, 'clients'),
                handle: (payload) => this._onClients(payload)
            }
        ]
    }

    /**
     * `sessionIds` is authoritative and complete - an empty array means nothing is
     * targeting this tab, not that the platform had nothing to say.
     *
     * Checked rather than asserted: this arrives off the broker, and a malformed message
     * should leave the tab reporting nothing rather than throwing inside a message handler.
     */
    private _onClients (payload: SubscriberPayload = {}): void {
        const ids = payload?.sessionIds
        useProductMcpStore().setClients(
            Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string') : []
        )
    }
}

const { create: createMcpSessionSubscriber, destroy: destroyMcpSessionSubscriber } = defineSubscriberSingleton(McpSessionSubscriber)

export function startMcpSession (team: TeamRef): McpSessionSubscriber {
    const orchestrator = getAppOrchestrator()
    const transport = createMqttTransport(orchestrator.$services.mqtt)
    const subscriber = createMcpSessionSubscriber({
        app: orchestrator.$app,
        router: orchestrator.$router,
        transport
    })
    subscriber.connect(team)
    return subscriber
}

export async function stopMcpSession (): Promise<void> {
    await destroyMcpSessionSubscriber()
}

export { createMcpSessionSubscriber, destroyMcpSessionSubscriber }

export default createMcpSessionSubscriber
