<template>
    <ff-button
        v-if="isAvailable"
        kind="expert"
        data-action="expert-build"
        :to="{ name: 'team-build', params: { team_slug: team.slug } }"
    >
        <template #icon-left>
            <img src="/ff-minimal-red.svg" alt="">
        </template>
        Build
    </ff-button>
</template>

<script>
import { mapState } from 'pinia'

import { useAccountSettingsStore } from '@/stores/account-settings.js'
import { useContextStore } from '@/stores/context.js'

export default {
    name: 'ExpertBuildButton',
    computed: {
        ...mapState(useContextStore, ['team']),
        ...mapState(useAccountSettingsStore, ['featuresCheck']),
        isAvailable () {
            return !!this.team &&
                !!this.featuresCheck.isAiFeatureEnabled &&
                !!this.featuresCheck.isExpertAssistantFeatureEnabled
        }
    }
}
</script>
