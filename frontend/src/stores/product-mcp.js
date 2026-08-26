import { defineStore } from 'pinia'

import { startTabPresence, stopTabPresence } from '@/publishers/tab-presence.publisher'
import { startMcpInflight, stopMcpInflight } from '@/subscribers/mcp-inflight.subscriber'

/**
 * Whether this tab is exposed to third-party MCP agents, and the comms that go with it.
 *
 * Two things run while it is active: the presence publisher, which tells the platform
 * this tab exists and what it is looking at, and the in-flight subscriber, which picks
 * up the requests those agents send back.
 *
 * The flag is persisted per tab so a reload does not silently drop a tab an agent is
 * already targeting.
 */
export const useProductMcpStore = defineStore('product-mcp', {
    state: () => ({
        active: false
    }),
    actions: {
        enable (team) {
            if (!team) return
            startTabPresence(team)
            startMcpInflight(team)
            this.active = true
        },
        async disable () {
            // The header mounts more than one toggle (a mobile one and a desktop one), so their
            // watchers and lifecycle hooks fire in the same tick. Clearing the flag before the
            // first await makes every call after the first a no-op, so one opt-out tears the
            // comms down once - and lets a caller tell whether it was the one that did it, which
            // is what keeps a single event from being announced once per button.
            if (!this.active) return false
            this.active = false
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
            await stopMcpInflight()
            await stopTabPresence({ announceClose: false })
        }
    },
    persist: {
        pick: ['active'],
        storage: sessionStorage
    }
})
