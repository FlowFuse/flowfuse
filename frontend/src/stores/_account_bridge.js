// Temporary bridge — reads account data from Vuex/Pinia during migration.
// Delete this file after the account stores are migrated to Pinia.

import { useAccountAuthStore } from '@/stores/account-auth.js'

export function useAccountBridge () {
    // Use require() instead of top-level imports to avoid circular module dependencies.
    // Static imports of store/index.js here would create a cycle:
    // ux-drawers.js → ux-navigation.js → _account_bridge.js → store/index.js → account/index.js → ux-navigation.js
    // account-team.js imports routes.js which imports all route files — pulling that in statically
    // here would drag the full router (and heavy Vue components) into every file that uses the bridge.
    // By requiring lazily inside the function body both stores are fully initialized before this runs.
    const store = require('../store/index.js').default
    const { useAccountTeamStore } = require('@/stores/account-team.js')
    const { user } = useAccountAuthStore()
    const { team, teamMembership, isTrialAccount, isTrialAccountExpired } = useAccountTeamStore()
    return {
        user,
        userId: user?.id || null,
        team,
        teamId: team?.id || null,
        teamSlug: team?.slug || null,
        features: store.state.account.features,
        teamMembership: teamMembership ?? { role: 0 },
        featuresCheck: store.getters['account/featuresCheck'],
        requiresBilling: store.getters['account/requiresBilling'],
        isTrialAccount,
        isTrialAccountExpired
    }
}
