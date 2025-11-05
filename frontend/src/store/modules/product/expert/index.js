import expertApi from '../../../../api/expert.js'

const initialState = () => ({
    context: [],
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
    },
    updateContext (state, message) {
        state.context.push(message)
    }
}

const actions = {
    setContext ({ commit }, payload) {
        commit('setContext', payload.data)
        commit('setSessionId', payload.sessionId)
    },
    updateContext ({ commit }, message) {
        commit('updateContext', message)
    },
    hydrateClient ({ commit }, { message, history, context, sessionId }) {
        return expertApi.hydrate({ message, history, context, sessionId })
            .then(response => {
                commit('updateContext', response)
            })
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
