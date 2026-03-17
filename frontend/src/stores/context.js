import { defineStore } from 'pinia'

import { useAccountBridge } from './_account_bridge.js'
import { useProductAssistantStore } from './product-assistant.js'

export const useContextStore = defineStore('context', {
    state: () => ({
        route: null,
        instance: null,
        device: null
    }),
    getters: {
        expert (state) {
            const account = useAccountBridge()
            const assistant = useProductAssistantStore()

            if (!state.route) {
                return {
                    assistantVersion: assistant.version,
                    assistantFeatures: assistant.assistantFeatures,
                    palette: null,
                    debugLog: null,
                    userId: account.userId,
                    teamId: account.teamId,
                    teamSlug: account.teamSlug,
                    instanceId: null,
                    deviceId: null,
                    applicationId: null,
                    isTrialAccount: account.isTrialAccount,
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
                if (useProductExpertStore().isFfAgent) {
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
                userId: account.userId,
                teamId: account.teamId,
                teamSlug: account.teamSlug,
                instanceId: instanceId ?? null,
                deviceId: deviceId ?? null,
                applicationId: applicationId ?? null,
                isTrialAccount: account.isTrialAccount,
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
