const state = () => ({
    rightDrawer: {
        state: false,
        component: null
    },
    tours: {
        welcome: false
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
    },
    activateTour (state, tour) {
        state.tours[tour] = true
    },
    deactivateTour (state, tour) {
        state.tours[tour] = false
    }
}

const actions = {
    openRightDrawer ({ commit }, { component }) {
        commit('openRightDrawer', { component })
    },
    closeRightDrawer ({ commit }) {
        commit('closeRightDrawer')
    },
    activateTour ({ commit }, tour) {
        commit('activateTour', tour)
    },
    deactivateTour ({ commit }, tour) {
        commit('deactivateTour', tour)
    }
}

export default {
    namespaced: true,
    state,
    getters,
    mutations,
    actions,
    meta: {
        persistence: {
            tours: {
                storage: 'localStorage'
            }
        }
    }
}
