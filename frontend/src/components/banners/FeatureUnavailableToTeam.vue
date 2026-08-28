<template>
    <div
        class="ff-page-banner my-4"
        :class="{minimal: minimal}"
        data-el="page-banner-feature-unavailable-to-team"
    >
        <SparklesIcon class="ff-icon mr-2" style="stroke-width: 1px;" />
        <slot>
            <div>
                <span v-if="fullMessage">
                    {{ fullMessage }}
                    Please <router-link class="ff-link" href="#" :to="upgradePath">{{ $t('ui.upgrade2') }}</router-link>
                    {{ $t('ui.yourTeamToContinue') }}
                </span>
                <span v-else>
                    {{ featureName }} is not available for your current Team.
                    Please
                    <router-link class="ff-link" href="#" :to="upgradePath">{{ $t('ui.upgrade2') }}</router-link> {{ $t('ui.yourTeamInOrderToUseIt') }}
                </span>
            </div>
        </slot>
        <SparklesIcon class="ff-icon ml-2" style="stroke-width: 1px;" />
    </div>
</template>

<script>
import { SparklesIcon } from '@heroicons/vue/24/outline'

import { mapState } from 'pinia'

import { t } from '../../i18n.js'

import { useContextStore } from '@/stores/context.js'

export default {
    name: 'FeatureUnavailableToTeam',
    components: {
        SparklesIcon
    },
    props: {
        featureName: {
            type: String,
            default: t('ui.thisFeature')
        },
        fullMessage: {
            type: String,
            default: ''
        },
        minimal: {
            type: Boolean,
            required: false,
            default: false
        }
    },
    computed: {
        ...mapState(useContextStore, ['team']),
        upgradePath () {
            return { name: 'team-change-type', params: { team_slug: this.team.slug } }
        }
    }
}
</script>
