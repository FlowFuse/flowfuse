import { defineStore } from 'pinia'

import { startTabPresence, stopTabPresence } from '@/publishers/tab-presence.publisher'
import alerts from '@/services/alerts.js'
import { startMcpInflight, stopMcpInflight } from '@/subscribers/mcp-inflight.subscriber'
import { startMcpSession, stopMcpSession } from '@/subscribers/mcp-session.subscriber'

/**
 * Whether this tab is exposed to third-party MCP agents, and the comms that go with it:
 * the presence publisher, the in-flight subscriber, and the session subscriber.
 *
 * Being exposed and being targeted are separate. `active` is the user's choice; `clients`
 * is the platform's answer, and a set rather than a flag because targeting is not
 * exclusive. It is never inferred locally - a pin can end by quietly expiring, which
 * produces no event, so the platform restates the full set on every heartbeat and the
 * count corrects itself.
 *
 * Only `active` is persisted: what holds this tab across a reload is the platform's to say.
 */
export const useProductMcpStore = defineStore('product-mcp', {
    state: () => ({
        active: false,
        // Opaque refs for the clients targeting this tab, as last reported by the platform
        clients: [],
        /**
         * The link to the platform is broken - dropped connection, or a heartbeat that did
         * not land. Reported by the presence publisher, the only thing here talking
         * continuously. Outranks everything else: `clients` cannot be trusted while it holds.
         */
        interrupted: false,
        /**
         * Mounted toggles. The header renders two, and without this the first to unmount
         * tears down comms the second is still showing as live. Lifecycle, not user intent,
         * so it is kept apart from `active` and never persisted.
         */
        mounts: 0,
        /**
         * Whether the platform has answered yet. The first answer is catching up, not an
         * event, so it sets the count silently - otherwise every reload of a held tab
         * reports a fresh arrival.
         */
        synced: false
    }),
    getters: {
        clientCount (state) {
            return state.clients.length
        },
        /**
         * 'off' - not exposed.
         * 'waiting' - exposed, nothing is targeting it.
         * 'connected' - at least one MCP client is driving this tab.
         * 'interrupted' - exposed, but this tab cannot reach the platform.
         *
         * Interrupted wins: the other two are things the platform said, and nothing is
         * confirming them while we cannot hear it.
         */
        status (state) {
            if (!state.active) return 'off'
            if (state.interrupted) return 'interrupted'
            return state.clients.length > 0 ? 'connected' : 'waiting'
        }
    },
    actions: {
        enable (team) {
            if (!team) return
            startTabPresence(team)
            startMcpInflight(team)
            startMcpSession(team)
            this.active = true
            // Exposing says nothing about who has taken it - the first heartbeat answers that
            this.clients = []
            this.synced = false
            this.interrupted = false
        },
        /** A toggle mounted. Comms are singletons, so only the first one starts them. */
        retain (team) {
            this.mounts += 1
            if (this.mounts === 1 && this.active && team) {
                this.enable(team)
            }
        },
        /** A toggle unmounted. Only the last one leaving takes the comms down. */
        async release () {
            this.mounts = Math.max(0, this.mounts - 1)
            if (this.mounts === 0 && this.active) {
                await this.teardown()
            }
        },
        async disable () {
            // Both toggles' watchers fire in the same tick. Clearing the flag before the first
            // await makes every later call a no-op, so one opt-out tears down once - and the
            // return value tells the caller whether it was the one that did it, which keeps a
            // single event from being announced per button.
            if (!this.active) return false
            this.active = false
            this.clients = []
            this.synced = false
            this.interrupted = false
            await stopMcpSession()
            await stopMcpInflight()
            // A real opt-out: drop the session entry now rather than leaving it listed
            await stopTabPresence({ announceClose: true })
            return true
        },
        /**
         * Drops the comms but leaves the flag, so an unmounting button comes back exposed.
         *
         * Silent by design: the platform reads a close notice as opting out and deletes the
         * session entry, un-listing a tab that is still open. A tab really going away is
         * covered by its connection's last will.
         */
        async teardown () {
            this.clients = []
            this.synced = false
            this.interrupted = false
            await stopMcpSession()
            await stopMcpInflight()
            await stopTabPresence({ announceClose: false })
        },
        markInterrupted () {
            this.interrupted = true
        },
        /**
         * Evidence the link works: a reconnect, or something we sent landing. Both matter,
         * because an interruption can start without the socket dropping (a rejected publish)
         * and the reconnect that would clear it never comes.
         *
         * `synced` resets so the restated count reads as catching up, not as arrivals.
         * `clients` is left alone: blanking it drops the button to amber "nothing is
         * targeting this tab" until the truth arrives, a worse lie than a slightly stale count.
         */
        markLinkHealthy () {
            if (!this.interrupted) return
            this.interrupted = false
            this.synced = false
        },
        /**
         * The platform's account of who is targeting this tab - a full set every time, which
         * is what lets a lapsed pin drop off on its own.
         *
         * Diffed rather than counted so a swap (one leaves as another arrives) is reported as
         * both, instead of passing silently because the total did not move.
         */
        setClients (sessionIds) {
            const next = Array.isArray(sessionIds) ? sessionIds : []
            const previous = this.clients
            this.clients = next

            if (!this.synced) {
                this.synced = true
                return
            }

            const arrived = next.filter(id => !previous.includes(id)).length
            const left = previous.filter(id => !next.includes(id)).length

            if (arrived > 0) {
                alerts.emit(arrived === 1
                    ? 'An MCP client is now targeting this tab.'
                    : `${arrived} MCP clients are now targeting this tab.`, 'confirmation')
            }
            if (left > 0) {
                alerts.emit(left === 1
                    ? 'An MCP client stopped targeting this tab.'
                    : `${left} MCP clients stopped targeting this tab.`, 'info')
            }
        }
    },
    persist: {
        pick: ['active'],
        storage: sessionStorage
    }
})
