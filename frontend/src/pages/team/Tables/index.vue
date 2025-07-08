<template>
    <ff-page>
        <template #header>
            <ff-page-header title="Tables">
                <template #context>
                    Live stream of CPU utilization of all Hosted Instances running through FlowFuse.
                </template>
            </ff-page-header>
        </template>

        <div id="team-tables">
            <template v-if="!featuresCheck.isTablesFeatureEnabled">
                <div class="banner-wrapper">
                    <FeatureUnavailable v-if="!featuresCheck.isTablesFeatureEnabledForPlatform" />
                    <FeatureUnavailableToTeam v-else-if="!featuresCheck.isTablesFeatureEnabledForTeam" />
                </div>

                <EmptyState>
                    <template #img>
                        <img alt="empty-state-logo" src="../../../images/empty-states/application-instances.png">
                    </template>
                    <template #header>Tables are not available!</template>
                    <template #message>
                        <p>
                            This feature is not supported for your Team Tier or in your Platform settings. Explore upgrade options to enable it.
                        </p>
                    </template>
                </EmptyState>
            </template>
            <template v-else>
                TBD
            </template>
        </div>
    </ff-page>
</template>

<script>
import { defineComponent } from 'vue'
import { mapGetters } from 'vuex'

import EmptyState from '../../../components/EmptyState.vue'
import FeatureUnavailable from '../../../components/banners/FeatureUnavailable.vue'
import FeatureUnavailableToTeam from '../../../components/banners/FeatureUnavailableToTeam.vue'

export default defineComponent({
    name: 'TeamTables',
    components: {
        FeatureUnavailable,
        FeatureUnavailableToTeam,
        EmptyState
    },
    computed: {
        ...mapGetters('account', ['featuresCheck'])
    },
    mounted () {
        if (!this.featuresCheck.isTablesFeatureEnabledForPlatform) {
            this.$router.push({ name: 'Home' })
        }
    }
})
</script>

<style scoped lang="scss">

</style>
