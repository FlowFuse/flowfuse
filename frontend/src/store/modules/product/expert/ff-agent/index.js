import { FF_AGENT } from '@/store/modules/product/expert/agents.js'

const initialState = () => ({
    context: null,
    sessionId: null,
    messages: [],

    // Session timing
    abortController: null,
    sessionStartTime: null,
    sessionWarningShown: false,
    sessionExpiredShown: false,
    sessionCheckTimer: null
})

const meta = {
    persistence: {
        context: {
            storage: 'localStorage',
            clearOnLogout: true
        }
    }
}

const state = initialState

const getters = {
    chatChannel: (state) => {
        return `ff/v1/expert/${state.sessionId}/agent`
    },
    mqttConnectionKey: () => `expert/${FF_AGENT}`
}

const mutations = {
    RESET (state) {
        Object.assign(state, initialState())
    }
}

const actions = {
    reset ({ commit }) {
        commit('RESET')
    }
}

export default {
    namespaced: true,
    state,
    initialState: initialState(),
    getters,
    mutations,
    actions,
    meta
}
