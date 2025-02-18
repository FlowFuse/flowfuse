export default {
    $resetState (state, initialState) {
        // resetting current state with given state (by this stage, the given initial state should be pruned to only
        // override required keys)
        Object.keys(initialState)
            .forEach(key => {
                state[key] = initialState[key]
            })
    }
}
