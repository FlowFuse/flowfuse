import { defineStore } from 'pinia'

import { useAccountAuthStore } from './account-auth.js'
import { useAccountTeamStore } from './account-team.js'
import { useProductAssistantStore } from './product-assistant.js'

export const useContextStore = defineStore('context', {
    state: () => ({
        route: null,
        instance: null,
        device: null
    }),
    getters: {
        expert (state) {
            const { user } = useAccountAuthStore()
            const { team, isTrialAccount } = useAccountTeamStore()
            const assistant = useProductAssistantStore()

            if (!state.route) {
                return {
                    assistantVersion: assistant.version,
                    assistantFeatures: assistant.assistantFeatures,
                    palette: null,
                    debugLog: null,
                    userId: user?.id ?? null,
                    teamId: team?.id ?? null,
                    teamSlug: team?.slug ?? null,
                    instanceId: null,
                    deviceId: null,
                    applicationId: null,
                    isTrialAccount,
                    nodeRedVersion: assistant.nodeRedVersion,
                    pageName: null,
                    rawRoute: {},
                    selectedNodes: null,
                    scope: 'ff-app'
                }
            }

            const instanceId = state.route.fullPath.includes('/instance/')
                ? state.route.params?.id
                : null
            const applicationId = state.route.fullPath.includes('/applications/')
                ? state.route.params?.id
                : null
            const deviceId = state.route.fullPath.includes('/device/')
                ? state.route.params?.id
                : null
            const scope =
                state.route.fullPath.includes('/instance/') &&
                state.route.fullPath.includes('editor')
                    ? 'immersive'
                    : 'ff-app'

            const { matched, redirectedFrom, ...rawRoute } = state.route ?? {}
            let selectedNodes = null

            if (scope === 'immersive' && assistant.selectedNodes.length > 0) {
                // Lazy require to avoid circular dependency:
                // context.js → product-expert.js → product-assistant.js → context.js
                const { useProductExpertStore } = require('./product-expert.js')
                if (useProductExpertStore().isSupportAgent) {
                    selectedNodes = assistant.selectedNodes
                }
            }

            let palette = null
            if (assistant.selectedContext?.some(e => e.value === 'palette')) {
                palette = assistant.paletteContribOnly
            }

            return {
                assistantVersion: assistant.version,
                assistantFeatures: assistant.assistantFeatures,
                palette,
                debugLog: assistant.debugLog,
                userId: user?.id ?? null,
                teamId: team?.id ?? null,
                teamSlug: team?.slug ?? null,
                instanceId: instanceId ?? null,
                deviceId: deviceId ?? null,
                applicationId: applicationId ?? null,
                isTrialAccount,
                pageName: state.route.name,
                nodeRedVersion: assistant.nodeRedVersion,
                rawRoute,
                selectedNodes,
                scope
            }
        }
    },
    actions: {
        updateRoute (route) { this.route = route },
        setInstance (instance) { this.instance = instance },
        setDevice (device) { this.device = device },
        clearInstance () { this.instance = null }
    }
})
