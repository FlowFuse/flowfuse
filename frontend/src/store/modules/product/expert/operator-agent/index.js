const initialState = () => ({
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
        sessionId: {
            storage: 'localStorage',
            clearOnLogout: true
        }
    }
}

const state = initialState

const getters = {}

const mutations = {}

const actions = {}

export default {
    namespaced: true,
    state,
    initialState: initialState(),
    getters,
    mutations,
    actions,
    meta
}
