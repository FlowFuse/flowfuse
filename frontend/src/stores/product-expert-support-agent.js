import { defineStore } from 'pinia'
import { markRaw } from 'vue'

import { SUPPORT_AGENT } from './product-expert-agents.js'

export const useProductExpertSupportAgentStore = defineStore('product-expert-support-agent', {
    state: () => ({
        context: null,
        sessionId: null,
        messages: [],
        activeTaskList: null,
        activePlanId: null,

        // Session timing
        abortController: null,
        sessionStartTime: null,
        sessionWarningShown: false,
        sessionExpiredShown: false,
        sessionCheckTimer: null,
        mqttConnectionKey: `expert/${SUPPORT_AGENT}`,
        inFlightRequests: new Map(),
        // Chat transaction ids whose reply already landed, kept briefly so a surface that
        // trails the final reply is still applied. A stopped turn never enters this set.
        recentlyCompletedTransactions: new Map(),
        // Stopped turns the agent hasn't confirmed as ended, keyed by transaction id with
        // the fallback timer that gives up waiting. Sends wait while any are listed.
        stoppingTransactions: new Map()
    }),
    actions: {
        reset () {
            if (this.sessionCheckTimer) clearInterval(this.sessionCheckTimer)
            this.stoppingTransactions.forEach(timer => clearTimeout(timer))
            this.$reset()
        },
        setSessionCheckTimer (timer) {
            this.sessionCheckTimer = markRaw(timer)
        }
    },
    persist: {
        pick: ['context', 'messages', 'activeTaskList', 'sessionId', 'sessionStartTime', 'sessionWarningShown', 'sessionExpiredShown'],
        storage: sessionStorage,
        afterHydrate ({ store }) {
            store.messages.forEach(msg => {
                msg._streamed = true
                if (msg.answer) {
                    msg.answer.forEach(a => { a._streamed = true })
                }
            })
        }
    }
})
