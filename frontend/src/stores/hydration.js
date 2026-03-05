import { defineStore } from 'pinia'

// Every store with a `persist` config must register itself here.
// The bootstrap service waits until all of these are hydrated.
// ⚠️  If you add persistence to a store but forget to add it here,
//    isHydrated will never become true and the app will hang on load.
const PERSISTED_STORES = [
    // 'ux-tours',
    // 'ux-navigation'
    // add more as stores are migrated with persistence
]

export const useHydrationStore = defineStore('hydration', {
    state: () => ({
        hydratedStores: []
    }),
    getters: {
        isHydrated: (state) =>
            PERSISTED_STORES.every(id => state.hydratedStores.includes(id))
    },
    actions: {
        markHydrated (storeId) {
            if (!this.hydratedStores.includes(storeId)) {
                this.hydratedStores.push(storeId)
            }
        }
    }
})
