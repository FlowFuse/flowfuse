/**
 * @typedef {Object} DrawerAction
 * @property {string} label - Action label.
 * @property {string|'primary'|'secondary'|'tertiary'|'danger'} kind - Button kind
 * @property {Function} handler - Callback to execute when clicked.
 * @property {boolean} disabled - Disabled state
 * @property {Component} iconLeft - A heroicon to display on the left side of the button.
 */

const initialState = () => ({
    leftDrawer: {
        state: false,
        component: null
    },
    rightDrawer: {
        state: false,
        component: null,
        header: null,
        wider: false,
        fixed: false,
        closeOnClickOutside: true,
        pinned: false,
        props: {},
        on: {},
        bind: {}
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
    openRightDrawer (state, { component, header, wider, fixed, closeOnClickOutside, props, on, bind }) {
        state.rightDrawer.state = true
        state.rightDrawer.wider = wider
        state.rightDrawer.fixed = fixed
        state.rightDrawer.closeOnClickOutside = closeOnClickOutside
        state.rightDrawer.component = component
        state.rightDrawer.header = header
        state.rightDrawer.props = props
        state.rightDrawer.on = on
        state.rightDrawer.bind = bind
    },
    closeRightDrawer (state) {
        state.rightDrawer.state = false
        state.rightDrawer.wider = false
        state.rightDrawer.fixed = false
        state.rightDrawer.component = null
        state.rightDrawer.header = null
        state.rightDrawer.pinned = false
        state.rightDrawer.props = {}
        state.rightDrawer.on = {}
        state.rightDrawer.bind = {}
    },
    setRightDrawerActions (state, actions) {
        if (state.rightDrawer.header) {
            state.rightDrawer.header.actions = actions
        } else {
            state.rightDrawer.header = {
                actions
            }
        }
    },
    setRightDrawerTitle (state, title) {
        if (state.rightDrawer.header) {
            state.rightDrawer.header.title = title
        } else {
            state.rightDrawer.header = {
                title
            }
        }
    },
    setPinnedDrawer (state, fixed) {
        state.rightDrawer.fixed = fixed
        state.rightDrawer.pinned = fixed
        // When fixed, prevent close on click outside
        state.rightDrawer.closeOnClickOutside = !fixed
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
    openRightDrawer ({ state, commit }, {
        component,
        header = null,
        wider = false,
        fixed = false,
        closeOnClickOutside = true,
        props = {},
        on = {},
        bind = {},
        overlay = false
    }) {
        if (state.rightDrawer.state && component.name === state.rightDrawer.component.name) return

        const openDrawer = () => {
            commit('openRightDrawer', {
                component,
                header,
                wider,
                fixed,
                closeOnClickOutside,
                props,
                on,
                bind
            })
            // Only show overlay if requested and drawer is not pinned
            if (overlay && !state.rightDrawer.pinned) {
                commit('ux/openOverlay', null, { root: true })
            }
        }

        if (state.rightDrawer.state) {
            commit('closeRightDrawer')
            setTimeout(openDrawer, 300)
        } else {
            openDrawer()
        }
    },
    closeRightDrawer ({ commit, rootState }) {
        commit('closeRightDrawer')

        if (rootState.ux.overlay) {
            commit('ux/closeOverlay', null, { root: true })
        }
    },

    /**
     * Updates the right drawer header by committing title and actions to the store if they exist.
     *
     * @param {Object} context - The Vuex action context object, typically used to access commit.
     * @param {Function} context.commit - The Vuex commit function to mutate state.
     * @param {Object} header - The header object containing properties for the right drawer.
     * @param {string} [header.title] - The title to set for the right drawer header.
     * @param {DrawerAction[]} [header.actions] - An array of actions to set for the right drawer header.
     *
     * @return {void}
     */
    setRightDrawerHeader ({ commit }, header) {
        if (header.title) {
            commit('setRightDrawerTitle', header.title)
        }
        if (header.actions) {
            commit('setRightDrawerActions', header.actions)
        }
    },

    /**
     * Sets the title for the right drawer by committing a mutation.
     *
     * @param {Object} context - The Vuex action context object, containing commit function.
     * @param {Function} context.commit - The commit function to invoke the mutation.
     * @param {string} title - The title to set for the right drawer.
     *
     * @return {void}
     */
    setRightDrawerTitle ({ commit }, title) {
        commit('setRightDrawerTitle', title)
    },

    /**
     * Sets the actions for the right drawer in the application.
     *
     * @param {Object} context - The Vuex action context object.
     * @param {Function} context.commit - The commit function to call mutations.
     * @param {DrawerAction[]} actions - Drawer actions.
     *
     * @return {void}
     */
    setRightDrawerActions ({ commit }, actions) {
        commit('setRightDrawerActions', actions)
    },

    /**
     * Toggles the fixed state of the right drawer.
     * When fixed, the drawer becomes part of the page layout (position: initial) and stays open.
     *
     * @param {Object} context - The Vuex action context object.
     * @param {Function} context.commit - The commit function to call mutations.
     * @param {Object} context.state - The current state.
     * @param {Object} context.rootState - The root state.
     *
     * @return {void}
     */
    togglePinDrawer ({ commit, state, rootState }) {
        const newFixedState = !state.rightDrawer.fixed
        commit('setPinnedDrawer', newFixedState)

        // Always close overlay when toggling (whether fixing or unfixing)
        if (rootState.ux.overlay) {
            commit('ux/closeOverlay', null, { root: true })
        }
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
