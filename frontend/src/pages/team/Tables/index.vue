<template>
    <ff-page>
        <template #header>
            <ff-page-header title="Tables" :tabs="tabs">
                <template #context>
                    Manage your Database tables all in one place with FlowFuse Tables
                </template>
            </ff-page-header>
        </template>

        <div id="team-tables" class="h-full">
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
                <ff-loading v-if="loading || pendingTeamChange" message="Loading Databases..." />

                <router-view v-else v-slot="{ Component }">
                    <transition name="page-fade" mode="out-in">
                        <component
                            :is="Component"
                            :key="$route.fullPath"
                            @set-tabs="tabs = $event"
                        />
                    </transition>
                </router-view>
            </template>
        </div>
    </ff-page>
</template>

<script>
import { defineComponent } from 'vue'
import { mapActions, mapGetters, mapState } from 'vuex'

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
    data () {
        return {
            loading: true,
            tabs: []
        }
    },
    computed: {
        ...mapGetters('account', ['featuresCheck', 'team', 'pendingTeamChange']),
        ...mapState('product/tables', ['databases'])
    },
    watch: {
        '$route.params.id': {
            immediate: true,
            handler (newVal) {
                if (newVal) {
                    this.updateDatabaseSelection(this.$route.params.id)
                }
            }
        }
    },
    updated () {
        if (!this.$route.params.id) {
            // if the route we hit doesn't contain a specific database id and the user already has a table, it means
            // he was redirected from somewhere to the generic tables page
            return this.$router.push({ name: 'team-tables-table', params: { id: this.databases[Object.keys(this.databases)[0]].id } })
        }
    },
    mounted () {
        if (this.pendingTeamChange) {
            return
        }

        if (!this.featuresCheck.isTablesFeatureEnabledForPlatform) {
            return this.$router.push({ name: 'Home' })
        }

        if (this.featuresCheck.isTablesFeatureEnabledForTeam) {
            this.getDatabases()
                .then(() => this.redirectIfNeeded())
                .catch(e => e)
                .finally(() => {
                    this.loading = false
                })
        }
    },
    methods: {
        ...mapActions('product/tables', ['getDatabases', 'updateDatabaseSelection']),
        redirectIfNeeded () {
            if (Object.keys(this.databases).length === 0) {
                // if the user doesn't have any tables, we'll redirect him to the offering page
                return this.$router.replace({ name: 'team-tables-add' })
            } else if (!this.$route.params.id) {
                // if the route we hit doesn't contain a specific database id and the user already has a table, it means
                // he was redirected from somewhere to the generic tables page
                return this.$router.push({ name: 'team-tables-table', params: { id: this.databases[Object.keys(this.databases)[0]].id } })
            }
        }
    }
})
</script>

<style scoped lang="scss">

</style>
