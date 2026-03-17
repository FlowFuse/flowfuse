import { defineStore } from 'pinia'
import { markRaw } from 'vue'

import expertApi from '../api/expert.js'
import useTimerHelper from '../composables/TimersHelper.js'

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
            //  TODO: this need to be removed when we have https://github.com/FlowFuse/flowfuse/issues/6520 part of
            //  https://github.com/FlowFuse/flowfuse/issues/6519 as it's a hacky workaround to the expert drawer opening up
            //  before we have a team loaded
            const { waitWhile } = useTimerHelper()
            await waitWhile(() => !useAccountBridge().team, { cutoffTries: 60 })

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
