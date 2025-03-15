export default {
    $resetState (state, { initialState, storePath }) {
        /*
         * State in this context refers to the rootState
         *
         * Because we're dealing with the rootState, we need to traverse the state to get to the targeted store.
         *
         * Resetting current state with given state (by this stage, the given initial state should be pruned to only
         * override required keys)
         */
        const keys = storePath.split('.')
        let current = state

        for (let i = 0; i < keys.length; i++) {
            current = current[keys[i]]
        }

        Object.keys(initialState)
            .forEach(property => {
                current[property] = initialState[property]
            })
    }
}
