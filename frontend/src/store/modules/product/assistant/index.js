import messagingService from '../../../../services/messaging.service.js'

const initialState = () => ({
    version: null,
    supportedActions: {},
    assistantFeatures: {},
    palette: {},
    scope: {
        target: 'nr-assistant',
        scope: 'flowfuse-expert',
        source: 'flowfuse-expert'
    },
    selectedNodes: []
})

const meta = {
    persistence: {}
}

const state = initialState()

const getters = {
    immersiveInstance: (state, getters, rootState) => {
        return rootState.context.instance
    },
    hasUserSelection: (state) => {
        return state.selectedNodes.length
    }
}

const mutations = {
    SET_VERSION (state, version) {
        state.version = version
    },
    SET_SUPPORTED_ACTIONS (state, supportedActions) {
        state.supportedActions = supportedActions
    },
    SET_PALETTE (state, palette) {
        state.palette = palette ?? []
    },
    SET_SELECTED_NODES (state, selection) {
        state.selectedNodes = selection
    },
    SET_FEATURES (state, features) {
        state.assistantFeatures = features
    },
    RESET (state) {
        const newState = initialState()
        Object.keys(newState).forEach(key => {
            state[key] = newState[key]
        })
    }
}

const actions = {
    async handleMessage ({ commit, getters, dispatch }, payload) {
        if (payload.origin !== getters.immersiveInstance.url) {
            console.warn('Received message from unknown origin. Ignoring.')
            return
        }
        switch (true) {
        case payload.data.type === 'assistant-ready':
            commit('SET_VERSION', payload.data.version)
            commit('SET_PALETTE', payload.data.palette)
            console.log(payload.data.features)

            commit('SET_FEATURES', payload.data.features)
            dispatch('requestSupportedActions')
            dispatch('requestSelectedNodes')
            return await dispatch('requestPalette')
        case payload.data.type === 'get-assistant-version':
            return dispatch('setVersion', payload.data.version)
        case payload.data.type === 'get-supported-actions':
            return dispatch('setSupportedActions', payload.data.supportedActions)
        case payload.data.type === 'set-palette':
            return dispatch('setPalette', payload.data.palette)
        case payload.data.type === 'set-selection':
            return dispatch('setSelectedNodes', payload.data.selection)
        default:
            // do nothing
        }
    },
    requestVersion: async ({ dispatch }) => {
        return dispatch('sendMessage', 'get-assistant-version')
    },
    requestSupportedActions: async ({ dispatch }) => {
        return dispatch('sendMessage', { type: 'get-supported-actions' })
    },
    requestPalette: async ({ dispatch }) => {
        return dispatch('sendMessage', { type: 'get-palette' })
    },
    requestSelectedNodes: async ({ dispatch }) => {
        return dispatch('sendMessage', { type: 'get-selection' })
    },
    setVersion: ({ commit }, version) => {
        commit('SET_VERSION', version)
    },
    setSupportedActions: ({ commit }, supportedActions) => {
        commit('SET_SUPPORTED_ACTIONS', supportedActions)
    },
    setPalette: ({ commit }, palette) => {
        commit('SET_PALETTE', palette)
    },
    setSelectedNodes: async ({ commit }, selection) => {
        commit('SET_SELECTED_NODES', selection)
    },
    reset: ({ commit }) => {
        commit('RESET')
    },
    sendFlowsToImport: async ({ dispatch }, flowsJson) => {
        return dispatch('sendMessage', {
            type: 'invoke-action',
            action: 'custom:import-flow',
            params: {
                flow: flowsJson // parameters to go with the action
            }
        })
    },
    installNodePackage: async ({ dispatch }, packageName) => {
        return dispatch('sendMessage', {
            type: 'invoke-action',
            action: 'core:manage-palette',
            params: {
                view: 'install',
                filter: packageName
            }
        })
    },
    manageNodePackage: async ({ dispatch }, packageName) => {
        return dispatch('sendMessage', {
            type: 'invoke-action',
            action: 'core:manage-palette',
            params: {
                view: 'nodes',
                filter: packageName
            }
        })
    },
    sendMessage ({ getters }, payload) {
        const service = messagingService()
        return service.sendMessage({
            message: {
                ...payload,
                ...state.scope // includes target, source, scope
            },
            target: window.frames['immersive-editor-iframe'],
            targetOrigin: getters.immersiveInstance?.url
        })
    }
}

export default {
    namespaced: true,
    state,
    initialState,
    getters,
    mutations,
    actions,
    meta
}
