<template>
    <div data-el="application-overview-page" class="flex-1 flex flex-col overflow-auto">
        <SectionTopMenu :hero="$t('ui.nodeRedInstances')" :help-header="$t('ui.nodeRedInstancesRunningInFlowfuse')" :info="$t('ui.hostedInstancesOfNodeRedOwnedByThisApplication')">
            <template #pictogram>
                <img src="../../images/pictograms/instance_red.png">
            </template>
            <template #helptext>
                <p>{{ $t('ui.thisIsAListOfNodeRedInstancesInThisApplicationHo') }}</p>
                <p>{{ $t('ui.itWillAlwaysRunTheLatestFlowDeployedInNodeRedAnd') }}</p>
                <p>{{ $t('ui.toEditAnApplicationSFlowOpenTheEditorOfTheInstan') }}</p>
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
                    {{ $t('ui.addInstance') }}
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
                :search-placeholder="$t('ui.searchInstances')"
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
                        :label="$t('ui.start')"
                        @click.stop="$emit('instance-start', row)"
                    />

                    <ff-kebab-item
                        :disabled="!row.notSuspended"
                        :label="$t('ui.restart')"
                        @click.stop="$emit('instance-restart', row)"
                    />

                    <ff-kebab-item
                        :disabled="!row.notSuspended"
                        kind="danger"
                        :label="$t('ui.suspend')"
                        @click.stop="$emit('instance-suspend', row)"
                    />

                    <ff-kebab-item
                        v-if="hasPermission('project:delete')"
                        kind="danger"
                        :label="$t('ui.delete')"
                        @click.stop="$emit('instance-delete', row)"
                    />
                </template>
            </ff-data-table>
            <EmptyState v-else-if="instancesAvailable">
                <template #img>
                    <img src="../../images/empty-states/application-instances.png">
                </template>
                <template #header>{{ $t('ui.addYourApplicationSFirstInstance') }}</template>
                <template #message>
                    <p>
                        {{ $t('ui.applicationsInFlowfuseAreUsedToManageGroupsOfNod') }}
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
                        {{ $t('ui.addInstance') }}
                    </ff-button>
                </template>
                <template #note>
                    <p>
                        {{ $t('ui.theFlowfuseTeamAlsoHaveMorePlannedForApplication') }}
                        <a class="ff-link" href="https://github.com/FlowFuse/flowfuse/issues/1734" target="_blank">
                            {{ $t('ui.sharedSettingsAcrossInstances') }}</a>.
                    </p>
                </template>
            </EmptyState>
            <EmptyState v-else>
                <template #img>
                    <img src="../../images/empty-states/application-instances.png">
                </template>
                <template #header>{{ $t('ui.hostedInstancesNotAvailable') }}</template>
                <template #message>
                    <p>
                        {{ $t('ui.hostedInstancesAreNotAvailableForThisTeamTierPle') }}
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

import { t } from '../../i18n.js'
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
                { key: 'running', label: t('ui.running') },
                { key: 'error', label: t('ui.error2') },
                { key: 'stopped', label: t('ui.notRunning') }
            ]
        }
    },
    computed: {
        ...mapState(useAccountSettingsStore, ['featuresCheck']),
        cloudColumns () {
            return [
                { label: t('ui.name'), class: ['w-1/2'], component: { is: markRaw(DeploymentName), map: { url: 'url' } } },
                {
                    label: t('ui.instanceStatus'),
                    class: ['w-1/5'],
                    instanceType: 'instance',
                    component: {
                        is: markRaw(InstanceStatusBadge),
                        map: { status: 'meta.state', instanceId: 'id' },
                        extraProps: { instanceType: 'instance' }
                    }
                },
                { label: t('ui.lastDeployed2'), class: ['w-1/5'], component: { is: markRaw(LastSeen), map: { lastSeenSince: 'flowLastUpdatedSince' } } },
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
                name: 'instance',
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
