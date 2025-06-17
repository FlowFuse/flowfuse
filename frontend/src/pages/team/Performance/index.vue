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
            <template v-if="!featuresCheck.isInstanceResourcesFeatureEnabled">
                <div class="banner-wrapper">
                    <FeatureUnavailable v-if="!featuresCheck.isInstanceResourcesFeatureEnabledForPlatform" />
                    <FeatureUnavailableToTeam v-else-if="!featuresCheck.isInstanceResourcesFeatureEnabledForTeam" />
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
                        :rows-selectable="true" initialSortKey="status" initialSortOrder="asc"
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
import InstanceStatusBadge from '../../instance/components/InstanceStatusBadge.vue'

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
                }, {
                    label: 'Status',
                    class: ['w-44'],
                    key: 'status',
                    sortable: true,
                    component: {
                        is: markRaw(InstanceStatusBadge),
                        map: { instanceId: 'id' },
                        extraProps: { instanceType: 'instance' }
                    }
                }, {
                    label: 'CPU Utilization',
                    key: 'cpuUtilization',
                    class: ['w-full', 'max-w-40'],
                    sortable: true,
                    component: {
                        is: markRaw(CPUUtilizationCell)
                    }
                }
            ],
            webSockets: []
        }
    },
    computed: {
        ...mapGetters('account', ['featuresCheck', 'team']),
        rows () {
            return this.instances.map(instance => ({
                instanceId: instance.id,
                name: instance.name,
                status: instance.status,
                connected: !!instance.performance?.connected,
                error: instance.performance?.error,
                cpuUtilization: instance.performance?.cpuUtilization,
                featureSupported: !!instance.performance?.featureSupported,
                stackCpuScale: instance.stack?.properties?.cpu ?? null
            }))
        },
        hasInstances () {
            return this.instances.length > 0
        }
    },
    mounted () {
        if (this.featuresCheck.isInstanceResourcesFeatureEnabled) {
            this.loadInstances()
        }
    },
    beforeUnmount () {
        this.webSockets.forEach(ws => {
            try {
                ws.close()
            } catch (_) {
                // Ignore errors when closing websockets
            }
        })
        this.webSockets = []
    },
    methods: {
        loadInstances () {
            this.loading = true
            teamApi.getTeamInstances(this.team.id)
                .then(res => {
                    this.instances = res.projects
                    this.instances.forEach(instance => {
                        if (instance.status === 'running') {
                            this.connectToLiveData(instance)
                        }
                    })
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
                    id: instance.instanceId
                }
            })
        },
        connectToLiveData (instance) {
            instance.performance = {
                connected: false,
                error: null,
                cpuUtilization: null,
                featureSupported: true
            }
            const uri = `/api/v1/projects/${instance.id}/resources/stream`
            const ws = new WebSocket(uri)
            ws.addEventListener('open', (event) => {
                instance.performance.connected = true
            })
            ws.addEventListener('message', async (event) => {
                // extract event.data and convert from Blob to text
                const data = JSON.parse(await event.data.text())
                // check for error
                if (data.err) {
                    instance.performance.error = data.err
                } else {
                    instance.performance.cpuUtilization = data.cpu
                }
            })
            ws.addEventListener('error', (event) => {
                console.error('event error')
                console.error(event)
                instance.performance.error = 'Error fetching live data. Please try again later.'
            })
            ws.addEventListener('close', (event) => {
                this.connected = false
                if (!instance.performance.error) {
                    // if we cannot connect, and see no error, the Websocket isn't supported
                    instance.performance.connected = false
                    instance.performance.featureSupported = false
                }
            })
            this.webSockets.push(ws)
        }
    }
}
</script>

<style scoped lang="scss">

</style>
