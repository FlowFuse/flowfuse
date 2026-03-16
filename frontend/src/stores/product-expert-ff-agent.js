import { defineStore } from 'pinia'
import { markRaw } from 'vue'

export const useProductExpertFfAgentStore = defineStore('product-expert-ff-agent', {
    state: () => ({
        context: null,
        sessionId: null,
        messages: [],
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
        pick: ['context', 'sessionId'],
        storage: localStorage
    }
})
