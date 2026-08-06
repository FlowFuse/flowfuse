<template>
    <div data-el="application-overview-page" class="flex-1 flex flex-col overflow-auto">
        <SectionTopMenu hero="Node-RED Instances" help-header="Node-RED Instances - Running in FlowFuse" info="Hosted instances of Node-RED, owned by this application.">
            <template #pictogram>
                <img src="../../images/pictograms/instance_red.png">
            </template>
            <template #helptext>
                <p>This is a list of Node-RED instances in this Application, hosted on the same domain as FlowFuse.</p>
                <p>It will always run the latest flow deployed in Node-RED and use the latest credentials and runtime settings defined in the Projects settings.</p>
                <p>To edit an Application's flow, open the editor of the Instance.</p>
            </template>
            <template v-if="instancesAvailable" #tools>
                <ff-button
                    v-ff-tooltip:left="!hasPermission('project:create', { application }) && 'Your role does not allow creating new instances. Contact a team admin to change your role.'"
                    data-action="create-instance"
                    :to="{ name: 'application-create-instance' }"
                    type="anchor"
                    :disabled="!hasPermission('project:create', { application })"
                >
                    <template #icon-left><PlusSmallIcon /></template>
                    Add Instance
                </ff-button>
            </template>
        </SectionTopMenu>
        <FeatureUnavailableToTeam v-if="!instancesAvailable" />
        <div class="space-y-6 flex-1 flex flex-col overflow-auto">
            <ff-data-table
                v-if="instances?.length > 0"
                data-el="cloud-instances"
                :columns="cloudColumns"
                :rows="cloudRows"
                :show-search="true"
                :search="searchTerm"
                search-placeholder="Search Instances"
                :rows-selectable="true"
                :loading="tableLoading"
                loading-type="skeleton"
                @row-selected="selectedCloudRow"
            >
                <template #actions>
                    <ff-popover
                        :button-text="selectedStatusGroups.length ? `Status (${selectedStatusGroups.length})` : 'Status'"
                        button-kind="secondary"
                        data-el="status-filter"
                    >
                        <template #panel>
                            <section class="status-filter-panel">
                                <popover-item
                                    v-for="filter in statusFilters" :key="filter.key"
                                    :title="filter.label"
                                    :data-action="'filter-' + filter.key"
                                    @click="toggleStatusGroup(filter.key)"
                                >
                                    <template #icon>
                                        <ff-checkbox
                                            :model-value="selectedStatusGroups.includes(filter.key)"
                                            style="top: -8px;"
                                            @click.stop.prevent="toggleStatusGroup(filter.key)"
                                        />
                                    </template>
                                </popover-item>
                            </section>
                        </template>
                    </ff-popover>
                </template>
                <template
                    v-if="hasPermission('project:change-status', { application })"
                    #context-menu="{row}"
                >
                    <ff-kebab-item
                        :disabled="row.pendingStateChange || row.running"
                        label="Start"
                        @click.stop="$emit('instance-start', row)"
                    />

                    <ff-kebab-item
                        :disabled="!row.notSuspended"
                        label="Restart"
                        @click.stop="$emit('instance-restart', row)"
                    />

                    <ff-kebab-item
                        :disabled="!row.notSuspended"
                        kind="danger"
                        label="Suspend"
                        @click.stop="$emit('instance-suspend', row)"
                    />

                    <ff-kebab-item
                        v-if="hasPermission('project:delete')"
                        kind="danger"
                        label="Delete"
                        @click.stop="$emit('instance-delete', row)"
                    />
                </template>
            </ff-data-table>
            <EmptyState v-else-if="instancesAvailable">
                <template #img>
                    <img src="../../images/empty-states/application-instances.png">
                </template>
                <template #header>Add your Application's First Instance</template>
                <template #message>
                    <p>
                        Applications in FlowFuse are used to manage groups of Node-RED Instances.
                    </p>
                </template>
                <template #actions>
                    <ff-button
                        v-ff-tooltip:bottom="!hasPermission('project:create', { application }) && 'Your role does not allow creating new instances. Contact a team admin to change your role.'"
                        :to="{ name: 'application-create-instance' }"
                        type="anchor"
                        :disabled="!hasPermission('project:create', { application })"
                    >
                        <template #icon-left><PlusSmallIcon /></template>
                        Add Instance
                    </ff-button>
                </template>
                <template #note>
                    <p>
                        The FlowFuse team also have more planned for Applications, including
                        <a class="ff-link" href="https://github.com/FlowFuse/flowfuse/issues/1734" target="_blank">
                            shared settings across Instances</a>.
                    </p>
                </template>
            </EmptyState>
            <EmptyState v-else>
                <template #img>
                    <img src="../../images/empty-states/application-instances.png">
                </template>
                <template #header>Hosted Instances Not Available</template>
                <template #message>
                    <p>
                        Hosted Instances are not available for this team tier. Please consider upgrading if you would like to enable this feature.
                    </p>
                </template>
            </EmptyState>
        </div>
    </div>
</template>

<script>

import { PlusSmallIcon } from '@heroicons/vue/24/outline'
import { mapState } from 'pinia'
import { markRaw } from 'vue'

import EmptyState from '../../components/EmptyState.vue'
import SectionTopMenu from '../../components/SectionTopMenu.vue'
import FeatureUnavailableToTeam from '../../components/banners/FeatureUnavailableToTeam.vue'
import { useInstanceStates } from '../../composables/InstanceStates.js'
import { useNavigationHelper } from '../../composables/NavigationHelper.js'
import usePermissions from '../../composables/Permissions.js'

import InstanceStatusBadge from '../instance/components/InstanceStatusBadge.vue'
import DashboardLinkCell from '../instance/components/cells/DashboardLink.vue'
import InstanceEditorLinkCell from '../instance/components/cells/InstanceEditorLink.vue'

import DeploymentName from './components/cells/DeploymentName.vue'
import LastSeen from './components/cells/LastSeen.vue'

import { useAccountSettingsStore } from '@/stores/account-settings.js'
import PopoverItem from '@/ui-components/components/PopoverItem.vue'

export default {
    name: 'ProjectOverview',
    components: {
        PlusSmallIcon,
        SectionTopMenu,
        EmptyState,
        FeatureUnavailableToTeam,
        PopoverItem
    },
    inheritAttrs: false,
    props: {
        application: {
            type: Object,
            required: true
        },
        instances: {
            type: Array,
            required: true
        },
        loadingInstanceStatuses: {
            type: Boolean,
            default: false
        }
    },
    emits: ['instance-delete', 'instance-suspend', 'instance-restart', 'instance-start'],
    setup () {
        const { navigateTo } = useNavigationHelper()
        const { hasPermission, isVisitingAdmin } = usePermissions()
        const { statesMap } = useInstanceStates()

        return {
            hasPermission,
            isVisitingAdmin,
            navigateTo,
            statesMap
        }
    },
    data () {
        return {
            searchTerm: '',
            selectedStatusGroups: [],
            statusFilters: [
                { key: 'running', label: 'Running' },
                { key: 'error', label: 'Error' },
                { key: 'stopped', label: 'Not Running' }
            ]
        }
    },
    computed: {
        ...mapState(useAccountSettingsStore, ['featuresCheck']),
        cloudColumns () {
            return [
                { label: 'Name', class: ['w-1/2'], component: { is: markRaw(DeploymentName), map: { url: 'url' } } },
                {
                    label: 'Instance Status',
                    class: ['w-1/5'],
                    instanceType: 'instance',
                    component: {
                        is: markRaw(InstanceStatusBadge),
                        map: { status: 'meta.state', instanceId: 'id' },
                        extraProps: { instanceType: 'instance' }
                    }
                },
                { label: 'Last Deployed', class: ['w-1/5'], component: { is: markRaw(LastSeen), map: { lastSeenSince: 'flowLastUpdatedSince' } } },
                { label: '', component: { is: markRaw(DashboardLinkCell), map: { instance: '_self', hidden: 'hideDashboard2Button' }, extraProps: { scope: 'application' } } },
                { label: '', component: { is: markRaw(InstanceEditorLinkCell), map: { instance: '_self' } } }
            ]
        },
        statusFilter () {
            if (this.selectedStatusGroups.length === 0) return null
            return new Set(this.selectedStatusGroups.flatMap(group => this.statesMap[group] || []))
        },
        filteredInstances () {
            if (!this.statusFilter) return this.instances
            return this.instances.filter(instance => this.statusFilter.has(instance.meta?.state))
        },
        tableLoading () {
            return this.loadingInstanceStatuses && !!this.statusFilter
        },
        cloudRows () {
            return this.filteredInstances.map((instance) => {
                instance.running = instance.meta?.state === 'running'
                instance.notSuspended = instance.meta?.state !== 'suspended'
                instance.isHA = instance.ha?.replicas !== undefined
                instance.disabled = !instance.running || this.isVisitingAdmin || instance.isHA
                instance._self = { ...instance }
                instance.hideDashboard2Button = !instance.settings?.dashboard2UI
                return instance
            })
        },
        instancesAvailable () {
            return this.featuresCheck?.isHostedInstancesEnabledForTeam
        }
    },
    mounted () {
        const statusParam = this.$route.query.status
        if (statusParam) {
            const groups = Array.isArray(statusParam) ? statusParam : [statusParam]
            this.selectedStatusGroups = groups.filter(group => this.statusFilters.some(f => f.key === group))
        }
        if (this.$route?.query?.searchQuery) {
            this.searchTerm = this.$route.query.searchQuery
        }
    },
    methods: {
        toggleStatusGroup (key) {
            const index = this.selectedStatusGroups.indexOf(key)
            if (index === -1) {
                this.selectedStatusGroups.push(key)
            } else {
                this.selectedStatusGroups.splice(index, 1)
            }
            this.$router.replace({
                query: {
                    ...this.$route.query,
                    status: this.selectedStatusGroups.length ? this.selectedStatusGroups : undefined
                }
            })
        },
        selectedCloudRow (cloudInstance, event) {
            this.navigateTo({
                name: 'Instance',
                params: {
                    id: cloudInstance.id
                }
            }, event)
        }
    }
}
</script>

<style lang="scss" scoped>
.status-filter-panel {
    white-space: nowrap;
}
</style>
