import { defineSubscriberSingleton } from './subscriber.factory'
import { SubscriberPayload, SubscriberRoute, TeamSubscriber } from './team-subscriber.contract'

import { announceTabPresence } from '@/publishers/tab-presence.publisher'
import getAppOrchestrator from '@/services/app.orchestrator'
import { useAccountAuthStore } from '@/stores/account-auth.js'
import { useProductMcpStore } from '@/stores/product-mcp.js'
import { createMqttTransport } from '@/transport/mqtt.transport'
import type { CreateSubscriberOptions, TeamRef, TeamSubscriberI } from '@/types/subscribers/subscriber.types'

const escapeForPattern = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Pinned to this tab's user and session, so an event meant for another tab is ignored.
 * The ACL already makes anything else unreachable; this is the same statement made locally.
 */
function sessionEventPattern (userId: string, sessionId: string, event: string): RegExp {
    return new RegExp(`^ff/v1/[^/]+/u/${escapeForPattern(userId)}/s/${escapeForPattern(sessionId)}/mcp/${event}$`)
}

/**
 * Listens for what the platform says is targeting this tab over MCP. The toggle only
 * exposes a tab; `clients` is who actually took it, and a full set rather than a flag
 * because targeting is not exclusive.
 *
 * The platform restates it on every heartbeat and on every pin change, so a pin that
 * ends by quietly expiring corrects itself without the tab inferring anything.
 *
 * The topic is the tab's own session and the ACL pins that segment to this connection's
 * credential, so a tab only hears about itself. It rides the team connection.
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

        // The exact topic rather than `mcp/+`: the broker ACL matches the subscription filter
        // literally, so subscribing by wildcard would need a rule permissive enough to admit
        // any event. There is only one, so name it.
        return [
            `ff/v1/${teamId}/u/${userId}/s/${authStore.getSessionId()}/mcp/clients`
        ]
    }

    /**
     * The platform's answer is not retained, so a heartbeat sent before this subscription
     * was live goes nowhere and the tab waits out the next interval. Asking for a fresh one
     * on subscribe closes that window, on first enable and on every reconnect.
     */
    protected _onSubscribed (): void {
        announceTabPresence()
    }

    protected _routes (): SubscriberRoute[] {
        const authStore = useAccountAuthStore()

        return [
            {
                pattern: sessionEventPattern(String(authStore.user?.id ?? ''), authStore.getSessionId(), 'clients'),
                handle: (payload) => this._onClients(payload)
            }
        ]
    }

    /**
     * `clients` is complete - an empty array means nothing is targeting this tab, not that
     * the platform had nothing to say. They are opaque refs, not MCP session ids (see
     * clientRef in forge/db/controllers/BrowserSession.js).
     *
     * Checked rather than asserted: this is broker data, and a malformed message should
     * leave the tab reporting nothing rather than throw inside a message handler.
     */
    private _onClients (payload: SubscriberPayload = {}): void {
        const refs = payload?.clients
        useProductMcpStore().setClients(
            Array.isArray(refs) ? refs.filter((ref): ref is string => typeof ref === 'string') : []
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
