const initialState = () => ({
    context: null
})

const meta = {
    persistence: {}
}

const state = initialState

const getters = {}

const mutation = {
    setContext (state, context) {
        state.context = context
    }
}

const actions = {
    setContext ({ commit }, context) {
        commit('setContext', context)
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
