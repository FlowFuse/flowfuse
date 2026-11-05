<template>
    <ff-button
        v-if="isAvailable"
        v-ff-tooltip:bottom="build.label"
        v-ff-track="build.event"
        kind="expert"
        data-action="expert-build"
        :aria-label="build.label"
        :to="{ name: build.route, params: { team_slug: team.slug } }"
    >
        <template #icon>
            <SparklesIcon />
        </template>
    </ff-button>
</template>

<script>
import { SparklesIcon } from '@heroicons/vue/24/outline'
import { mapState } from 'pinia'

import { useAccountSettingsStore } from '@/stores/account-settings.js'
import { useContextStore } from '@/stores/context.js'

const BUILDS = {
    instance: {
        route: 'team-build-instance',
        label: 'Build an instance using the FlowFuse Expert',
        event: 'ff-expert-build-instance-clicked'
    },
    application: {
        route: 'team-build-application',
        label: 'Build an application using the FlowFuse Expert',
        event: 'ff-expert-build-application-clicked'
    },
    device: {
        route: 'team-build-device',
        label: 'Build a remote instance using the FlowFuse Expert',
        event: 'ff-expert-build-device-clicked'
    }
}

export default {
    name: 'ExpertBuildButton',
    components: {
        SparklesIcon
    },
    props: {
        // What the button sits next to: picks the build route, which tells the
        // Expert what the user wants, and the hover text
        target: {
            type: String,
            required: true,
            validator: value => Object.keys(BUILDS).includes(value)
        }
    },
    computed: {
        ...mapState(useContextStore, ['team']),
        ...mapState(useAccountSettingsStore, ['featuresCheck']),
        build () {
            return BUILDS[this.target]
        },
        isAvailable () {
            return !!this.team &&
                !!this.featuresCheck.isAiFeatureEnabled &&
                !!this.featuresCheck.isExpertAssistantFeatureEnabled
        }
    }
}
</script>
