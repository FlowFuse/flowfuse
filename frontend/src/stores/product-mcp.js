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
            await this.teardown()
            this.active = false
        },
        /**
         * Drops the comms but leaves the flag alone, so a tab that is only unmounting
         * the button (rather than opting out) comes back up exposed.
         */
        async teardown () {
            await stopMcpInflight()
            await stopTabPresence()
        }
    },
    persist: {
        pick: ['active'],
        storage: sessionStorage
    }
})
