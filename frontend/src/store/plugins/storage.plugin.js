import LocalStorageService from '../../services/storage/local-storage.service.js'
import SessionStorageService from '../../services/storage/session-storage.service.js'

const STORE_KEY = 'store'

const filterByStorageType = (obj, storageType) => {
    return Object.keys(obj).reduce((acc, key) => {
        const item = obj[key]

        // Check if the item has a rules object with storage matching the specified storageType
        if (item && item.rules && item.rules.storage === storageType) {
            acc[key] = item.payload
        } else if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
            // If the item is an object and doesn't directly match the rules, recurse into it
            const filteredSubItem = filterByStorageType(item, storageType)
            if (Object.keys(filteredSubItem).length > 0) {
                acc[key] = filteredSubItem
            }
        }

        return acc
    }, {})
}

function updateVuexFromStorageDriver (store, storageDriver) {
    if (storageDriver.getItem(STORE_KEY)) {
        // Replace the state object with the stored item
        const currentState = store.state
        const storedState = JSON.parse(storageDriver.getItem(STORE_KEY))
        Object.keys(storedState)
            .forEach(storeKey => {
                // We have to replace vuex module state key by key to avoid breaking reactivity with the vuex browser plugin
                // Updating the entire store/module at once or using state.replaceState(storedState) will have the same outcome
                Object.keys(storedState[storeKey])
                    .filter(k => k) // filter out 'global' module
                    .forEach(key => {
                        currentState[storeKey][key] = storedState[storeKey][key]
                    })
            })
    }
}

export default (store) => {
    const modules = store._modules.root._children
    const modulePersistenceRules = {}

    // map each module persistence rules
    Object.keys(modules)
        .filter(k => k) // filter out 'global' module
        .forEach((key) => {
            modulePersistenceRules[key] = modules[key]._rawModule.meta?.persistence ?? {}
        })

    // Register a 'global' module to handle the store initialization
    store.registerModule('', {
        mutations: {
            initializeStore: () => {
                updateVuexFromStorageDriver(store, LocalStorageService)
                updateVuexFromStorageDriver(store, SessionStorageService)
            }
        }
    })

    store.subscribe((mutation, state) => {
        const result = {}
        Object.keys(state)
            .filter(k => k) // filter out 'global' module
            .forEach((key) => {
                const storeState = state[key]
                const statePersistenceRules = modulePersistenceRules[key]
                const persistentKeys = Object.keys(statePersistenceRules)

                // reducing state to eliminate the keys than do not require persistence
                result[key] = persistentKeys.reduce((acc, key) => {
                    if (Object.prototype.hasOwnProperty.call(storeState, key)) {
                        // setting default localStorage as storage type if not set
                        if (!statePersistenceRules[key].storage) {
                            statePersistenceRules[key].storage = 'localStorage'
                        }

                        acc[key] = {
                            payload: storeState[key],
                            rules: statePersistenceRules[key]
                        }
                    }
                    return acc
                }, {})
            })

        LocalStorageService.setItem(STORE_KEY, filterByStorageType(result, 'localStorage'))
        SessionStorageService.setItem(STORE_KEY, filterByStorageType(result, 'sessionStorage'))
    })
}
