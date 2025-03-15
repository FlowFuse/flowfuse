import LocalStorageService from '../../services/storage/local-storage.service.js'
import SessionStorageService from '../../services/storage/session-storage.service.js'

const STORE_KEY = 'store'

/**
 * Filters state by storage type (localStorage or sessionStorage)
 * Iterates through the state object and retains only the keys that match the specified storage type.
 */
const filterByStorageType = (obj, storageType) => {
    return Object.keys(obj).reduce((acc, key) => {
        const item = obj[key]

        // Check if the item has a persistence rule matching the specified storage type
        if (item && item.rules && item.rules.storage === storageType) {
            acc[key] = item.payload
        } else if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
            // Recursively filter nested objects
            const filteredSubItem = filterByStorageType(item, storageType)
            if (Object.keys(filteredSubItem).length > 0) {
                acc[key] = filteredSubItem
            }
        }

        return acc
    }, {})
}

/**
 * Recursively traverses Vuex modules to extract persistence rules for each module.
 * This allows each module (including nested ones) to have independent persistence settings.
 */
const traverseModules = (modules, path = '') => {
    return Object.keys(modules).reduce((acc, key) => {
        const fullPath = path ? `${path}/${key}` : key
        acc[fullPath] = modules[key]._rawModule.meta?.persistence ?? {}

        // Recursively traverse child modules
        if (modules[key]._children) {
            Object.assign(acc, traverseModules(modules[key]._children, fullPath))
        }
        return acc
    }, {})
}

/**
 * Restores Vuex state from storage while merging nested states.
 * Ensures that nested modules stored in different storage types are not overridden by their parent modules.
 */
function updateVuexFromStorageDriver (store, storageDriver) {
    if (storageDriver.getItem(STORE_KEY)) {
        const currentState = store.state
        const storedState = JSON.parse(storageDriver.getItem(STORE_KEY))

        Object.keys(storedState).forEach(storeKey => {
            const keys = storeKey.split('/')
            let targetState = currentState

            // Traverse through nested modules, ensuring that parent modules exist
            for (let i = 0; i < keys.length - 1; i++) {
                if (!targetState[keys[i]]) targetState[keys[i]] = {}
                targetState = targetState[keys[i]]
            }

            // Merge stored state into the existing module state instead of replacing it
            Object.assign(targetState[keys[keys.length - 1]], storedState[storeKey])
        })
    }
}

export default (store) => {
    // Extract persistence rules for all Vuex modules, including nested ones
    const modulePersistenceRules = traverseModules(store._modules.root._children)

    // Register an initialization mutation to restore persisted state on startup
    store.registerModule('', {
        mutations: {
            initializeStore: () => {
                updateVuexFromStorageDriver(store, LocalStorageService)
                updateVuexFromStorageDriver(store, SessionStorageService)
            }
        }
    })

    // Subscribe to Vuex mutations to persist state whenever a mutation occurs
    store.subscribe((mutation, state) => {
        const result = {}

        Object.keys(modulePersistenceRules).forEach(modulePath => {
            const keys = modulePath.split('/')
            let targetState = state

            // Traverse through nested state modules
            for (const key of keys) {
                if (!targetState[key]) return
                targetState = targetState[key]
            }

            const statePersistenceRules = modulePersistenceRules[modulePath]
            const persistentKeys = Object.keys(statePersistenceRules)

            // Reduce state to include only the keys that should be persisted
            result[modulePath] = persistentKeys.reduce((acc, key) => {
                if (Object.prototype.hasOwnProperty.call(targetState, key)) {
                    // Default to localStorage if no storage type is set
                    if (!statePersistenceRules[key].storage) {
                        statePersistenceRules[key].storage = 'localStorage'
                    }

                    acc[key] = {
                        payload: targetState[key],
                        rules: statePersistenceRules[key]
                    }
                }
                return acc
            }, {})
        })

        // Persist state to localStorage
        LocalStorageService.setItem(
            STORE_KEY,
            JSON.stringify(filterByStorageType(result, 'localStorage'))
        )

        // Persist state to sessionStorage
        SessionStorageService.setItem(
            STORE_KEY,
            JSON.stringify(filterByStorageType(result, 'sessionStorage'))
        )
    })
}
