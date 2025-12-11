const initialState = () => ({
    context: null,
    sessionId: null,
    messages: [],

    // Session timing
    sessionStartTime: null,
    sessionWarningShown: false,
    sessionExpiredShown: false,
    sessionCheckTimer: null,

    transactionId: null
})

const meta = {
    persistence: {
        context: {
            storage: 'localStorage',
            clearOnLogout: true
        },
        sessionId: {
            storage: 'localStorage',
            clearOnLogout: true
        }
    }
}

const state = initialState

const getters = {}

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
