const initialState = () => ({
    leftDrawer: {
        state: false,
        component: null
    },
    rightDrawer: {
        state: false,
        component: null,
        wider: false,
        props: {}
    }
})

const meta = {
    persistence: { }
}

const state = initialState

const getters = {
    hiddenLeftDrawer: (state, rootGetters) => {
        const rootGetter = rootGetters['ux/mainNavContext']
        return state.leftDrawer.component?.name === 'MainNav' && rootGetter?.length === 0
    }
}

const mutations = {
    openRightDrawer (state, { component, wider, props }) {
        state.rightDrawer.state = true
        state.rightDrawer.wider = wider
        state.rightDrawer.component = component
        state.rightDrawer.props = props
    },
    closeRightDrawer (state) {
        state.rightDrawer.state = false
        state.rightDrawer.wider = false
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
    setLeftDrawer (state, component) {
        state.leftDrawer.component = component
    }
}

const actions = {
    openRightDrawer ({ state, commit }, { component, wider = false, props = {}, overlay = false }) {
        if (state.rightDrawer.state && component.name === state.rightDrawer.component.name) return

        if (state.rightDrawer.state) {
            commit('closeRightDrawer')
            setTimeout(() => {
                commit('openRightDrawer', {
                    component,
                    wider,
                    props
                })
                if (overlay) {
                    commit('ux/openOverlay', null, { root: true })
                }
            }, 300)
        } else {
            commit('openRightDrawer', { component, wider, props })
            if (overlay) {
                commit('ux/openOverlay', null, { root: true })
            }
        }
    },
    closeRightDrawer ({ commit, rootState }) {
        setTimeout(() => {
            commit('closeRightDrawer')

            if (rootState.ux.overlay) {
                commit('ux/closeOverlay', null, { root: true })
            }
        }, 100)
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
    setLeftDrawer ({ commit }, component) {
        commit('setLeftDrawer', component)
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
