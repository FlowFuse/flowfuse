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
                    Please <router-link class="ff-link" href="#" :to="navigateToUpgrade">upgrade</router-link>
                    your Team to continue.
                </span>
                <span v-else>
                    {{ featureName }} is not available for your current Team.
                    Please
                    <router-link class="ff-link" href="#" :to="navigateToUpgrade">upgrade</router-link> your Team in order to use it.
                </span>
            </div>
        </slot>
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
            return { name: 'TeamChangeType', params: { team_slug: this.team.slug } }
        }
    },
    methods: {
        navigateToUpgrade () {
            this.$router.push(this.upgradePath)
        }
    }
}
</script>
