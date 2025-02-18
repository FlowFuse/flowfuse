export default (initialState, meta) => ({
    $resetState ({ commit }) {
        initialState = initialState()

        if (meta.persistence) {
            // remove any initial state keys from the initial state that should be ignored while clearing state
            Object.entries(meta.persistence)
                .forEach(([key, value]) => {
                    if (value.clearOnLogout === false) {
                        delete initialState[key]
                    }
                })
        }

        commit('$resetState', initialState)
    }
})
