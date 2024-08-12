<template>
    <div
        class="ff-page-banner my-4"
        :class="{minimal: minimal}"
        data-el="page-banner-feature-unavailable-to-team"
    >
        <SparklesIcon class="ff-icon mr-2" style="stroke-width: 1px;" />
        <div>
            <span v-if="fullMessage">
                {{ fullMessage }}
                Please <a class="ff-link" href="#" @click="navigateToUpgrade">upgrade</a> your Team to continue.
            </span>
            <span v-else>
                {{ featureName }} is not available for your current Team.
                Please <a class="ff-link" href="#" @click="navigateToUpgrade">upgrade</a> your Team in order to use it.
            </span>
        </div>
        <SparklesIcon class="ff-icon ml-2" style="stroke-width: 1px;" />
    </div>
</template>

<script>
import { SparklesIcon } from '@heroicons/vue/outline'

import { mapState } from 'vuex'

export default {
    name: 'FeatureUnavailableToTeam',
    components: {
        SparklesIcon
    },
    props: {
        featureName: {
            type: String,
            default: 'This feature'
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
        ...mapState('account', ['team']),
        upgradePath () {
            return '/team/' + this.team.slug + '/settings/change-type'
        }
    },
    methods: {
        navigateToUpgrade () {
            this.$router.push(this.upgradePath)
        }
    }
}
</script>
