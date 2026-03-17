// Temporary bridge — reads account data from Vuex during migration.
// Delete this file after the account stores are migrated to Pinia.

export function useAccountBridge () {
    // Use require() instead of a top-level import to avoid a circular module dependency.
    // Static imports of store/index.js here would create a cycle:
    // ux-drawers.js → ux-navigation.js → _account-bridge.js → store/index.js → account/index.js → ux-navigation.js
    // By requiring lazily inside the function body, the Vuex store is fully initialized before this runs.
    const store = require('../store/index.js').default
    return {
        team: store.state.account.team,
        features: store.state.account.features,
        teamMembership: store.getters['account/teamMembership'] ?? { role: 0 },
        featuresCheck: store.getters['account/featuresCheck'],
        requiresBilling: store.getters['account/requiresBilling'],
        isTrialAccountExpired: store.getters['account/isTrialAccountExpired']
    }
}
