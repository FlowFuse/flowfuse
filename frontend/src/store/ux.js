const state = () => ({
    leftDrawer: {
        state: false,
        component: null
    },
    rightDrawer: {
        state: false,
        component: null
    },
    tours: {
        welcome: false,
        education: false
    },
    windowWidth: window.innerWidth
})

const getters = {
    shouldShowLeftBar: (state, getters, rootState, rootGetters) => (route) => {
        return rootGetters['account/hasAvailableTeams'] || route.path.includes('/account/')
    },
    hasFloatingLeftBar: (state) => state.windowWidth <= 1024,
    shouldShowEducationModal: (state) => {
        return state.tours.education
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
    openLeftDrawer (state) {
        state.leftDrawer.state = true
    },
    closeLeftDrawer (state) {
        state.leftDrawer.state = false
    },
    toggleLeftDrawer (state) {
        state.leftDrawer.state = !state.leftDrawer.state
    },
    activateTour (state, tour) {
        state.tours[tour] = true
    },
    deactivateTour (state, tour) {
        state.tours[tour] = false
    },
    seWindowWidth (state, width) {
        state.windowWidth = width
    }
}

const actions = {
    openRightDrawer ({ commit }, { component }) {
        commit('openRightDrawer', { component })
    },
    closeRightDrawer ({ commit }) {
        commit('closeRightDrawer')
    },
    openLeftDrawer ({ commit }) {
        commit('openLeftDrawer')
    },
    closeLeftDrawer ({ commit }) {
        commit('closeLeftDrawer')
    },
    toggleLeftDrawer ({ commit }) {
        commit('toggleLeftDrawer')
    },
    activateTour ({ commit }, tour) {
        commit('activateTour', tour)
    },
    deactivateTour ({ commit, state }, tour) {
        if (tour === 'welcome') {
            commit('activateTour', 'education')
        }
        commit('deactivateTour', tour)
    },
    updateWindowWidth ({ commit }) {
        commit('seWindowWidth', window.innerWidth)
    },
    setupResizeListener ({ dispatch }) {
        window.addEventListener('resize', () => {
            dispatch('updateWindowWidth')
        })
    },
    removeResizeListener () {
        window.removeEventListener('resize', this.updateWindowWidth)
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
