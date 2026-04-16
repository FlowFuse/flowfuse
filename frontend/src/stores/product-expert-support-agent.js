import { defineStore } from 'pinia'
import { markRaw } from 'vue'

import { SUPPORT_AGENT } from './product-expert-agents.js'

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
        sessionCheckTimer: null,
        mqttConnectionKey: `expert/${SUPPORT_AGENT}`
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
