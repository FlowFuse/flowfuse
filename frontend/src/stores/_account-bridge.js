// Temporary bridge — reads account data from Vuex during migration.
// Delete this file after the account stores are migrated to Pinia.
import store from '../store/index.js'

export function useAccountBridge () {
    return {
        team: store.state.account.team,
        features: store.state.account.features,
        teamMembership: store.getters['account/teamMembership'] ?? { role: 0 },
        featuresCheck: store.getters['account/featuresCheck'],
        requiresBilling: store.getters['account/requiresBilling'],
        isTrialAccountExpired: store.getters['account/isTrialAccountExpired']
    }
}
