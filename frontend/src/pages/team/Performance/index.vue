<template>
    <ff-page>
        <template #header>
            <ff-page-header title="Performance">
                <template #context>
                    Live stream of CPU utilization of all Hosted Instances running through FlowFuse.
                </template>
            </ff-page-header>
        </template>

        <div id="team-bom">
            <template v-if="!featuresCheck.isPerformanceFeatureEnabled">
                <div class="banner-wrapper">
                    <FeatureUnavailable v-if="!featuresCheck.isBOMFeatureEnabledForPlatform" />
                    <FeatureUnavailableToTeam v-else-if="!featuresCheck.isBOMFeatureEnabledForTeam" />
                </div>

                <EmptyState>
                    <template #img>
                        <img alt="empty-state-logo" src="../../../images/empty-states/application-instances.png">
                    </template>
                    <template #header>Performance Analysis is not available!</template>
                    <template #message>
                        <p>
                            This feature is not supported for your Team Tier or in your Platform settings. Explore upgrade options to enable it.
                        </p>
                    </template>
                </EmptyState>
            </template>

            <template v-else>
                <ff-loading v-if="loading" message="Loading Instances..." />

                <div v-else-if="hasInstances">
                    <ff-data-table
                        data-el="instances-table" :columns="columns" :rows="rows"
                        :show-search="true" search-placeholder="Search Hosted Instances..."
                        :rows-selectable="true" initialSortKey="cpuUtilization" initialSortOrder="desc"
                        @row-selected="openInstance"
                    />
                </div>

                <EmptyState v-else>
                    <template #img>
                        <img alt="empty-state-logo" src="../../../images/empty-states/application-instances.png">
                    </template>
                    <template #header>No Hosted Instances Found</template>
                    <template #message>
                        <p>
                            We've not been able to find any Hosted Instances for this team.
                        </p>
                        <p>
                            Once you create an Hosted Instance, you'll be able to view its performance data (e.g. CPU Utilization) for each Hosted Instance here.
                        </p>
                    </template>
                </EmptyState>
            </template>
        </div>
    </ff-page>
</template>

<script>
import { markRaw } from 'vue'
import { mapGetters } from 'vuex'

import teamApi from '../../../api/team.js'

import EmptyState from '../../../components/EmptyState.vue'
import FeatureUnavailable from '../../../components/banners/FeatureUnavailable.vue'
import FeatureUnavailableToTeam from '../../../components/banners/FeatureUnavailableToTeam.vue'
import usePermissions from '../../../composables/Permissions.js'
import DeploymentName from '../../application/components/cells/DeploymentName.vue'

import CPUUtilizationCell from './components/CPUUtilizationCell.vue'

export default {
    name: 'TeamPerformance',
    components: {
        FeatureUnavailableToTeam,
        FeatureUnavailable,
        EmptyState
    },
    setup () {
        const { hasPermission } = usePermissions()
        return {
            hasPermission
        }
    },
    data () {
        return {
            loading: false,
            searchTerm: '',
            instances: [],
            columns: [
                {
                    label: 'Instance Name',
                    key: 'name',
                    class: ['min-w-40', 'whitespace-nowrap'],
                    component: {
                        is: markRaw(DeploymentName)
                    }
                },
                {
                    label: 'CPU Utilization',
                    key: 'cpuUtilization',
                    class: ['w-full', 'max-w-40'],
                    component: {
                        is: markRaw(CPUUtilizationCell)
                    }
                }
            ],
            cpuUtilization: {}
        }
    },
    computed: {
        ...mapGetters('account', ['featuresCheck', 'team']),
        rows () {
            return this.instances.map(instance => ({
                id: instance.id,
                name: instance.name,
                cpuUtilization: this.cpuUtilization[instance.id] || (Math.random() * 100)
            }))
        },
        hasInstances () {
            return this.instances.length > 0
        }
    },
    mounted () {
        if (this.featuresCheck.isPerformanceFeatureEnabled) {
            this.loadInstances()
        }
    },
    methods: {
        loadInstances () {
            this.loading = true
            teamApi.getTeamInstances(this.team.id)
                .then(res => {
                    this.instances = res.projects
                })
                .catch(e => e)
                .finally(() => {
                    this.loading = false
                })
        },
        openInstance (instance) {
            this.$router.push({
                name: 'Instance',
                params: {
                    id: instance.id
                }
            })
        }
    }
}
</script>

<style scoped lang="scss">

</style>
