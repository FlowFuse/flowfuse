// Temporary bridge — reads account data from Pinia during migration.
// Delete this file after the account stores are migrated to Pinia (Task 15).

import { storeToRefs } from 'pinia'

import { useAccountAuthStore } from '@/stores/account-auth.js'
import { useAccountSettingsStore } from '@/stores/account-settings.js'

export function useAccountBridge () {
    // Use require() instead of top-level imports to avoid circular module dependencies.
    // context.js imports _account_bridge.js statically; requiring context.js lazily here avoids a cycle.
    const { useContextStore } = require('@/stores/context.js')
    const { user } = storeToRefs(useAccountAuthStore())
    const { features, featuresCheck, requiresBilling } = storeToRefs(useAccountSettingsStore())
    const { team, teamMembership, isTrialAccount, isTrialAccountExpired } = storeToRefs(useContextStore())
    return {
        user: user.value,
        userId: user.value?.id || null,
        team: team.value,
        teamId: team.value?.id || null,
        teamSlug: team.value?.slug || null,
        features,
        teamMembership: teamMembership.value ?? { role: 0 },
        featuresCheck,
        requiresBilling,
        isTrialAccount: isTrialAccount.value,
        isTrialAccountExpired: isTrialAccountExpired.value
    }
}
