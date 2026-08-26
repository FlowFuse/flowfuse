import { defineStore } from 'pinia'

import { startTabPresence, stopTabPresence } from '@/publishers/tab-presence.publisher'
import alerts from '@/services/alerts.js'
import { startMcpInflight, stopMcpInflight } from '@/subscribers/mcp-inflight.subscriber'
import { startMcpSession, stopMcpSession } from '@/subscribers/mcp-session.subscriber'

/**
 * Whether this tab is exposed to third-party MCP agents, and the comms that go with it.
 *
 * Three things run while it is active: the presence publisher, which tells the platform
 * this tab exists and what it is looking at, the in-flight subscriber, which picks up the
 * requests those agents send back, and the session subscriber, which hears how many of
 * them are currently targeting this tab.
 *
 * Being exposed and being targeted are separate things. `active` is the user's choice.
 * `clients` is the platform's answer, and it is not a boolean: targeting is not exclusive,
 * so several MCP clients can drive the same tab at once and the user is entitled to see
 * how many.
 *
 * `clients` is never inferred locally. A tab can be dropped by a client that simply goes
 * quiet and lets its pin expire, which produces no event to listen for, so guessing would
 * drift. The platform answers with the full set on every presence heartbeat, which makes
 * the count self-correcting and survives a reload without anything having to ask.
 *
 * Only `active` is persisted per tab: whether anything still holds this tab across a
 * reload is the platform's to say.
 */
export const useProductMcpStore = defineStore('product-mcp', {
    state: () => ({
        active: false,
        // MCP session ids currently targeting this tab, as last reported by the platform.
        clients: [],
        /**
         * The tab's link to the platform is broken: the broker connection dropped, or a
         * presence heartbeat failed to land. Reported by the presence publisher, which is
         * the only thing here that talks continuously and so the only thing that can tell.
         *
         * This outranks everything else the button can say. While it holds, `clients` is
         * whatever the platform last managed to tell us and is not to be trusted - which is
         * the point: we cannot know what is targeting a tab we cannot hear from.
         */
        interrupted: false,
        /**
         * Whether the platform has answered yet. The first answer is the tab catching up,
         * not something that just happened, so it sets the count without announcing it -
         * otherwise every reload of a tab an agent already holds reports a fresh arrival.
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
         * Interrupted is checked first: a tab that cannot hear from the platform has no
         * business claiming either of the other two, because both are things the platform
         * told it and neither is still being confirmed.
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
            // Exposing a tab says nothing about anyone having taken it, and a reload
            // cannot know what was targeting it. The first heartbeat answers this.
            this.clients = []
            this.synced = false
            this.interrupted = false
        },
        async disable () {
            // The header mounts more than one toggle (a mobile one and a desktop one), so their
            // watchers and lifecycle hooks fire in the same tick. Clearing the flag before the
            // first await makes every call after the first a no-op, so one opt-out tears the
            // comms down once - and lets a caller tell whether it was the one that did it, which
            // is what keeps a single event from being announced once per button.
            if (!this.active) return false
            this.active = false
            this.clients = []
            this.synced = false
            this.interrupted = false
            await stopMcpSession()
            await stopMcpInflight()
            // A real opt-out: tell the platform to drop this tab's session entry now rather
            // than leaving it listed as targetable until the entry expires.
            await stopTabPresence({ announceClose: true })
            return true
        },
        /**
         * Drops the comms but leaves the flag alone, so a tab that is only unmounting
         * the button (rather than opting out) comes back up exposed.
         *
         * Deliberately silent: the platform reads the close notice as the user opting out and
         * deletes the tab's session entry, which would un-list a tab that is still open and
         * still exposed. Leaving the entry in place lets the remount refresh it instead, and a
         * tab that really is going away is still covered by its connection's last will.
         */
        async teardown () {
            this.clients = []
            this.synced = false
            this.interrupted = false
            await stopMcpSession()
            await stopMcpInflight()
            await stopTabPresence({ announceClose: false })
        },
        /**
         * The platform's account of who is targeting this tab. Replaces rather than merges:
         * it is a full set every time, which is what lets a lapsed pin drop off on its own.
         *
         * The difference against what we held is the interesting part: an agent picking up
         * this tab, or letting it go, is worth saying out loud. Comparing sets rather than
         * counts means a swap (one leaves as another arrives) is reported as both, instead
         * of passing silently because the total happened not to move.
         */
        markInterrupted () {
            this.interrupted = true
        },
        /**
         * The link is back. `synced` is reset too: the count we were holding is from before
         * the outage and the platform gets to restate it on the next heartbeat, which should
         * not be announced as clients arriving or leaving when it is really just us catching
         * up on what changed while we were deaf.
         */
        markLinkHealthy () {
            if (!this.interrupted) return
            this.interrupted = false
            this.clients = []
            this.synced = false
        },
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
