const state = () => ({
    rightDrawer: {
        state: false,
        component: null
    }
})

const getters = {}

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
    openRightDrawer (state, { component }) {
        state.commit('openRightDrawer', { component })
    },
    closeRightDrawer (state) {
        state.commit('closeRightDrawer')
    }
}

export default {
    namespaced: true,
    state,
    getters,
    mutations,
    actions
}
