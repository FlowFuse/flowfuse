import { defineStore } from 'pinia'
import { markRaw } from 'vue'

import expertApi from '../api/expert.js'

import { useAccountBridge } from './_account-bridge.js'

export const useProductExpertOperatorAgentStore = defineStore('product-expert-operator-agent', {
    state: () => ({
        sessionId: null,
        messages: [],
        sessionStartTime: null,
        sessionWarningShown: false,
        sessionExpiredShown: false,
        sessionCheckTimer: null,
        capabilityServers: [],
        selectedCapabilities: []
    }),
    getters: {
        capabilities: (state) => state.capabilityServers.map(c => ({
            ...c,
            toolCount: c.resources.length + c.tools.length + c.prompts.length
        }))
    },
    actions: {
        reset () {
            if (this.sessionCheckTimer) clearInterval(this.sessionCheckTimer)
            Object.assign(this, {
                sessionId: null,
                messages: [],
                sessionStartTime: null,
                sessionWarningShown: false,
                sessionExpiredShown: false,
                sessionCheckTimer: null,
                capabilityServers: [],
                selectedCapabilities: []
            })
        },
        setSelectedCapabilities (caps) { this.selectedCapabilities = caps },
        setSessionCheckTimer (timer) { this.sessionCheckTimer = markRaw(timer) },
        async getCapabilities () {
            const { team } = useAccountBridge()
            const data = await expertApi.getCapabilities({ context: { teamId: team.id } })
            this.capabilityServers = data.servers || []
        }
    },
    persist: {
        pick: ['sessionId'],
        storage: localStorage
    }
})
