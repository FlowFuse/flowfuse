export default {
    $resetState ({ commit }) {
        function resetStore (module, storePath) {
            const hasInitialState = Object.prototype.hasOwnProperty.call(module, 'initialState') &&
                typeof module.initialState === 'object'
            const hasPersistence = Object.prototype.hasOwnProperty.call(module.meta ?? {}, 'persistence') &&
                typeof module.meta.persistence === 'object'

            if (hasInitialState && hasPersistence) {
                // remove keys from the initial state that should be ignored while clearing state
                Object.entries(module.meta.persistence ?? {})
                    .forEach(([key, value]) => {
                        if (value.clearOnLogout === false) {
                            delete module.initialState[key]
                        }
                    })

                // reset nestedModules
                if (Object.prototype.hasOwnProperty.call(module, 'modules')) {
                    Object.keys(module.modules)
                        .filter(m => m)
                        .forEach(nestedModule => {
                            const nestedPath = `${storePath}.${nestedModule}`
                            resetStore(module.modules[nestedModule], nestedPath)
                        })
                }

                commit('$resetState', {
                    initialState: module.initialState,
                    storePath
                })
            }
        }

        // We need to use the rawModule because it contains any additional keys stored in the module (e.g., initialState, persistence)
        const rawModules = this._modules?.root?._rawModule?.modules ?? null

        if (rawModules) {
            Object.keys(rawModules)
                .filter(m => m)
                .forEach(store => resetStore(rawModules[store], store))
        }
    }
}
