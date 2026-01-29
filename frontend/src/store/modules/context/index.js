const initialState = () => ({
    route: null,
    instance: null
})

const meta = {
    persistence: { }
}

const state = initialState

const getters = {
    expert: (state, getters, rootState, rootGetters) => {
        // Return safe defaults when route is not yet initialized
        if (!state.route) {
            return {
                userId: rootState.account?.user?.id || null,
                teamId: rootState.account?.team?.id || null,
                teamSlug: rootState.account?.team?.slug || null,
                instanceId: null,
                deviceId: null,
                applicationId: null,
                isTrialAccount: rootGetters['account/isTrialAccount'] || false,
                pageName: null,
                rawRoute: {},
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

        return {
            userId: rootState.account?.user?.id || null,
            teamId: rootState.account?.team?.id || null,
            teamSlug: rootState.account?.team?.slug || null,
            instanceId: instanceId ?? null,
            deviceId: deviceId ?? null,
            applicationId: applicationId ?? null,
            isTrialAccount: rootGetters['account/isTrialAccount'] || false,
            selectedNodes: rootGetters['product/assistant/immersiveInstance'] ? rootState['product/assistant/selectedNodes'] : [],
            pageName: state.route.name,
            rawRoute,
            scope
        }
    }
}

const mutations = {
    UPDATE_ROUTE (state, route) {
        state.route = route
    },
    SET_INSTANCE (state, instance) { state.instance = instance },
    CLEAR_INSTANCE (state) { state.instance = null }
}

const actions = {
    updateRoute ({ commit }, route) {
        commit('UPDATE_ROUTE', route)
    },
    setInstance ({ commit }, instance) { commit('SET_INSTANCE', instance) },
    clearInstance ({ commit }) { commit('CLEAR_INSTANCE') }
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
