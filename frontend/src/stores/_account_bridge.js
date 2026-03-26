// Temporary bridge — reads account data from Pinia during migration.
// Delete this file after the account stores are migrated to Pinia (Task 15).

import { useAccountAuthStore } from '@/stores/account-auth.js'
import { useAccountSettingsStore } from '@/stores/account-settings.js'
import { useAccountTeamStore } from '@/stores/account-team.js'

export function useAccountBridge () {
    const { user } = useAccountAuthStore()
    const { team, teamMembership, isTrialAccount, isTrialAccountExpired } = useAccountTeamStore()
    const { features, featuresCheck, requiresBilling } = useAccountSettingsStore()
    return {
        user,
        userId: user?.id || null,
        team,
        teamId: team?.id || null,
        teamSlug: team?.slug || null,
        features,
        teamMembership: teamMembership ?? { role: 0 },
        featuresCheck,
        requiresBilling,
        isTrialAccount,
        isTrialAccountExpired
    }
}
