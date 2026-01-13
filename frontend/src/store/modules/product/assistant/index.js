import messagingService from '../../../../services/messaging.service.js'

const initialState = () => ({
    version: null,
    supportedActions: {}
})

const meta = {
    persistence: {}
}

const state = initialState()

const getters = {
    immersiveInstance: (state, getters, rootState) => {
        return rootState.context.instance
    }
}

const mutations = {
    SET_VERSION (state, version) {
        state.version = version
    },
    SET_SUPPORTED_ACTIONS (state, supportedActions) {
        state.supportedActions = supportedActions
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
            return await dispatch('requestSupportedActions')
        case payload.data.type === 'get-assistant-version':
            return dispatch('setVersion', payload.data.version)
        case payload.data.type === 'get-supported-actions':
            return dispatch('setSupportedActions', payload.data.supportedActions)
        default:
            // do nothing
        }
    },
    requestVersion: async ({ getters }) => {
        const service = messagingService()
        service.sendMessage({
            message: { type: 'get-assistant-version' },
            target: window.frames['immersive-editor-iframe'],
            targetOrigin: getters.immersiveInstance?.url
        })
    },
    requestSupportedActions: async ({ getters }) => {
        const service = messagingService()
        const spreadElements = {
            message: { type: 'get-supported-actions' },
            target: window.frames['immersive-editor-iframe'],
            targetOrigin: getters.immersiveInstance?.url
        }

        service.sendMessage({
            ...spreadElements
        })
    },
    setVersion: ({ commit }, version) => {
        commit('SET_VERSION', version)
    },
    setSupportedActions: ({ commit }, supportedActions) => {
        commit('SET_SUPPORTED_ACTIONS', supportedActions)
    },
    reset: ({ commit }) => {
        commit('RESET')
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
