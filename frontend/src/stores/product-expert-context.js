import { defineStore } from 'pinia'

import { useAccountBridge } from './_account_bridge.js'
import { useProductExpertInsightsAgentStore } from './product-expert-insights-agent.js'

export const useProductExpertContextStore = defineStore('product-expert-context', {
    state: () => ({
        shouldWakeUpAssistant: false
    }),
    actions: {
        /**
         * Called by messaging.service.js when Node-RED sends a context update.
         * Stores context on the insights-agent store and flags that the assistant should wake up.
         * Intentionally a leaf — no imports from product-expert.js — to break the cycle:
         * product-expert.js → product-assistant.js → messaging.service.js → product-expert-context.js
         */
        setContext ({ data, sessionId }) {
            const { featuresCheck } = useAccountBridge()
            if (featuresCheck.isExpertAssistantFeatureEnabled === false) {
                return
            }

            const insightsAgentStore = useProductExpertInsightsAgentStore()
            insightsAgentStore.context = data

            if (sessionId) {
                insightsAgentStore.sessionId = sessionId
            }

            this.shouldWakeUpAssistant = true
        },

        clearWakeUp () {
            this.shouldWakeUpAssistant = false
        }
    },
    persist: {
        pick: ['shouldWakeUpAssistant'],
        storage: localStorage
    }
})
