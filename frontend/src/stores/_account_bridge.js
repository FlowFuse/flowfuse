// Temporary bridge — reads account data from Pinia during migration.
// Delete this file after the account stores are migrated to Pinia (Task 15).

import { useAccountAuthStore } from '@/stores/account-auth.js'
import { useAccountSettingsStore } from '@/stores/account-settings.js'

export function useAccountBridge () {
    // Use require() instead of top-level imports to avoid circular module dependencies.
    // context.js imports _account_bridge.js statically; requiring context.js lazily here avoids a cycle.
    const { useContextStore } = require('@/stores/context.js')
    const authStore = useAccountAuthStore()
    const contextStore = useContextStore()
    const accountSettingsStore = useAccountSettingsStore()
    return {
        user: authStore.user,
        userId: authStore.user?.id || null,
        team: contextStore.team,
        teamId: contextStore.team?.id || null,
        teamSlug: contextStore.team?.slug || null,
        features: accountSettingsStore.features,
        teamMembership: contextStore.teamMembership ?? { role: 0 },
        featuresCheck: accountSettingsStore.featuresCheck,
        requiresBilling: accountSettingsStore.requiresBilling,
        isTrialAccount: contextStore.isTrialAccount,
        isTrialAccountExpired: contextStore.isTrialAccountExpired
    }
}
