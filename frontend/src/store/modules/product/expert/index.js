const initialState = () => ({
    context: null,
    sessionId: null
})

const meta = {
    persistence: {}
}

const state = initialState

const getters = {}

const mutation = {
    setContext (state, context) {
        state.context = context
    },
    setSessionId (state, sessionId) {
        state.sessionId = sessionId
    }
}

const actions = {
    setContext ({ commit }, payload) {
        commit('setContext', payload.data)
        commit('setSessionId', payload.sessionId)
    }
}

export default {
    namespaced: true,
    meta,
    state,
    getters,
    mutations: mutation,
    actions
}
