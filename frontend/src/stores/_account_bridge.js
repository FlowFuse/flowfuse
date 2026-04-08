// Temporary bridge — reads account data from Vuex/Pinia during migration.
// Delete this file after the account stores are migrated to Pinia.

import { storeToRefs } from 'pinia'

import { useAccountAuthStore } from '@/stores/account-auth.js'

export function useAccountBridge () {
    // Use require() instead of top-level imports to avoid circular module dependencies.
    // Static imports of store/index.js here would create a cycle:
    // ux-drawers.js → ux-navigation.js → _account_bridge.js → store/index.js → account/index.js → ux-navigation.js
    // context.js imports _account_bridge.js statically; requiring context.js lazily here avoids a cycle.
    const store = require('../store/index.js').default
    const { useContextStore } = require('@/stores/context.js')
    const { user } = storeToRefs(useAccountAuthStore())
    const { team, teamMembership, isTrialAccount, isTrialAccountExpired } = storeToRefs(useContextStore())
    return {
        user: user.value,
        userId: user.value?.id || null,
        team: team.value,
        teamId: team.value?.id || null,
        teamSlug: team.value?.slug || null,
        features: store.state.account.features,
        teamMembership: teamMembership.value ?? { role: 0 },
        featuresCheck: store.getters['account/featuresCheck'],
        requiresBilling: store.getters['account/requiresBilling'],
        isTrialAccount: isTrialAccount.value,
        isTrialAccountExpired: isTrialAccountExpired.value
    }
}
