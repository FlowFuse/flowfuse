const initialState = () => ({
    route: null
})

const meta = {
    persistence: { }
}

const state = initialState

const getters = {
    expert: (state, getters, rootState, rootGetters) => {
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
            pageName: state.route.name,
            rawRoute,
            scope
        }
    }
}

const mutations = {
    UPDATE_ROUTE (state, route) {
        state.route = route
    }
}

const actions = {
    updateRoute ({ commit }, route) {
        commit('UPDATE_ROUTE', route)
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
