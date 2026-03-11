export function skipResetPlugin ({ store, options }) {
    const skipKeys = options.skipReset || []
    const originalReset = store.$reset?.bind(store)

    store.$reset = () => {
        const preserved = {}
        skipKeys.forEach(key => { preserved[key] = store[key] })
        if (typeof originalReset === 'function') originalReset()
        store.$patch(preserved)
    }
}
