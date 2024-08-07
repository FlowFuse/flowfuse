const state = () => ({
    rightDrawer: {
        state: false,
        component: null
    }
})

const getters = {
    shouldShowLeftMenu: (state, getters, rootState, rootGetters) => (route) => {
        return rootGetters['account/hasAvailableTeams'] || route.path.includes('/account/')
    }
}

const mutations = {
    openRightDrawer (state, { component }) {
        state.rightDrawer.state = true
        state.rightDrawer.component = component
    },
    closeRightDrawer (state) {
        state.rightDrawer.state = false
        state.rightDrawer.component = null
    }
}

const actions = {
    openRightDrawer ({ commit }, { component }) {
        commit('openRightDrawer', { component })
    },
    closeRightDrawer ({ commit }) {
        commit('closeRightDrawer')
    }
}

export default {
    namespaced: true,
    state,
    getters,
    mutations,
    actions
}
