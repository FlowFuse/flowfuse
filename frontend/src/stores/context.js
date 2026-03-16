import { defineStore } from 'pinia'

import { useAccountBridge } from './_account_bridge.js' // bridge — remove after all deps migrated

export const useContextStore = defineStore('context', {
    state: () => ({
        route: null,
        instance: null,
        device: null
    }),
    getters: {
        // Bridge version — reads from Vuex for account/assistant/expert data.
        // Update in PR 12 (product-expert) to use Pinia store imports directly.
        expert (state) {
            // Use require() to avoid circular module dependencies at load time.
            // Falls back to safe defaults when the Vuex store is unavailable (e.g. isolated unit tests).
            let rootState, rootGetters
            try {
                const store = require('../store/index.js').default
                rootState = store.state
                rootGetters = store.getters
            } catch {
                return {
                    assistantVersion: null,
                    assistantFeatures: {},
                    palette: null,
                    debugLog: null,
                    userId: null,
                    teamId: null,
                    teamSlug: null,
                    instanceId: null,
                    deviceId: null,
                    applicationId: null,
                    isTrialAccount: false,
                    nodeRedVersion: null,
                    pageName: null,
                    rawRoute: {},
                    selectedNodes: null,
                    scope: 'ff-app'
                }
            }

            if (!state.route) {
                // Use the account bridge for account-related fields
                const account = useAccountBridge()
                return {
                    assistantVersion: rootState.product.assistant.version,
                    assistantFeatures: rootState.product.assistant.assistantFeatures,
                    palette: null,
                    debugLog: null,
                    userId: rootState.account?.user?.id || null,
                    teamId: account.team?.id || null,
                    teamSlug: account.team?.slug || null,
                    instanceId: null,
                    deviceId: null,
                    applicationId: null,
                    isTrialAccount: account.featuresCheck?.isTrialAccount || false,
                    nodeRedVersion: rootState.product.assistant.nodeRedVersion,
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

            if (
                scope === 'immersive' &&
                rootGetters['product/expert/isFfAgent'] &&
                rootState.product.assistant.selectedNodes.length > 0
            ) {
                selectedNodes = rootState.product.assistant.selectedNodes
            }

            let palette = null
            if (rootState.product.assistant.selectedContext?.some(e => e.value === 'palette')) {
                palette = rootGetters['product/assistant/paletteContribOnly']
            }

            return {
                assistantVersion: rootState.product.assistant.version,
                assistantFeatures: rootState.product.assistant.assistantFeatures,
                palette,
                debugLog: rootGetters['product/assistant/debugLog'],
                userId: rootState.account?.user?.id || null,
                teamId: rootState.account?.team?.id || null,
                teamSlug: rootState.account?.team?.slug || null,
                instanceId: instanceId ?? null,
                deviceId: deviceId ?? null,
                applicationId: applicationId ?? null,
                isTrialAccount: rootGetters['account/isTrialAccount'] || false,
                pageName: state.route.name,
                nodeRedVersion: rootState.product.assistant.nodeRedVersion,
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
