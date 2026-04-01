import { defineStore } from 'pinia'
import { markRaw } from 'vue'

export const useProductExpertSupportAgentStore = defineStore('product-expert-support-agent', {
    state: () => ({
        context: null,
        sessionId: null,
        messages: [],

        // Session timing
        abortController: null,
        sessionStartTime: null,
        sessionWarningShown: false,
        sessionExpiredShown: false,
        sessionCheckTimer: null
    }),
    actions: {
        reset () {
            if (this.sessionCheckTimer) clearInterval(this.sessionCheckTimer)
            this.$reset()
        },
        setSessionCheckTimer (timer) {
            this.sessionCheckTimer = markRaw(timer)
        }
    },
    persist: {
        pick: ['context'],
        storage: localStorage
    }
})
