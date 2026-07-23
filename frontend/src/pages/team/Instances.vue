<template>
    <ff-page>
        <template #header>
            <ff-page-header title="Hosted Instances">
                <template #context>
                    <span>A list of all Node-RED instances belonging to this Team.</span>
                </template>
                <template #help-header>
                    Instances
                </template>
                <template #pictogram>
                    <img src="../../images/pictograms/instance_red.png">
                </template>
                <template #helptext>
                    <p>
                        This is a list of all Node-RED instances belonging to this team running
                        in this FlowFuse.
                    </p>
                    <p>
                        Each Instance is a customised version of Node-RED that includes various
                        FlowFuse plugins to integrate it with the platform.
                    </p>
                    <p>
                        A number of the standard Node-RED settings are exposed for customisation,
                        and they can be preset by applying a Template upon creation of an Instance.
                    </p>
                </template>
            </ff-page-header>
        </template>
        <div class="flex-1 flex flex-col overflow-auto">
            <div class="banner-wrapper">
                <FeatureUnavailableToTeam v-if="!instancesAvailable" />
            </div>
            <template v-if="instancesAvailable">
                <ff-data-table
                    v-if="loading || instances.length > 0 || hasFilter"
                    data-el="instances-table" :columns="columns" :rows="instances" :show-search="true"
                    search-placeholder="Search by name..."
                    :initialSortKey="sort.key" :initialSortOrder="sort.order"
                    :rows-selectable="true"
                    :pagination="paginationProps"
                    :server-side-search="true"
                    :loading="loading"
                    loading-type="skeleton"
                    @row-selected="openInstance"
                    @update:search="updateSearch"
                    @update:sort="updateSort"
                    @update:page="onPageChange"
                    @update:page-size="onPageSizeChange"
                >
                    <template #actions>
                        <ff-popover
                            :button-text="selectedStatusGroups.length ? `Status (${selectedStatusGroups.length})` : 'Status'"
                            button-kind="secondary"
                            data-el="status-filter"
                        >
                            <template #panel>
                                <section>
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
                        <ff-button
                            v-ff-tooltip:left="!hasPermission('project:create') && 'Your role does not allow creating new instances. Contact a team admin to change your role.'"
                            data-action="create-project"
                            kind="primary"
                            :to="{name: 'CreateInstance'}"
                            :disabled="!hasPermission('project:create')"
                        >
                            <template #icon-left>
                                <PlusSmallIcon />
                            </template>
                            Create Instance
                        </ff-button>
                    </template>
                    <template #row-actions="{row}">
                        <dashboard-link v-if="!!row.settings?.dashboard2UI?.length" :disabled="row.status !== 'running'" :instance="row" />
                        <instance-editor-link
                            v-if="hasPermission('team:projects:list')"
                            :instance="row"
                            :disabled="row.status !== 'running'"
                            disabled-reason="The Instance is not running"
                        />
                    </template>
                    <template
                        #context-menu="{row}"
                    >
                        <ff-kebab-item
                            v-if="row.canChangeStatus"
                            :disabled="row.pendingStateChange || row.running || row.optimisticStateChange"
                            label="Start"
                            @click.stop="instanceStart(row)"
                        />

                        <ff-kebab-item
                            v-if="row.canChangeStatus"
                            :disabled="!row.notSuspended"
                            label="Restart"
                            @click.stop="instanceRestart(row)"
                        />

                        <ff-kebab-item
                            v-if="row.canChangeStatus"
                            :disabled="!row.notSuspended"
                            kind="danger"
                            label="Suspend"
                            @click.stop="instanceShowConfirmSuspend(row)"
                        />

                        <ff-kebab-item
                            v-if="row.canDelete"
                            kind="danger"
                            label="Delete"
                            @click.stop="instanceShowConfirmDelete(row)"
                        />
                    </template>
                </ff-data-table>
                <EmptyState v-else>
                    <template #img>
                        <img src="../../images/empty-states/team-instances.png">
                    </template>
                    <template #header>Get Started with your First Node-RED Instance</template>
                    <template #message>
                        <p>
                            Instances are managed in FlowFuse via <ff-team-link
                                class="ff-link"
                                :to="{name:'Applications', params: {team_slug: team.slug}}"
                            >
                                Applications
                            </ff-team-link>.
                        </p>
                        <p>
                            You can create your first Instance when creating your first Application, or add an Instance to an existing Application if you have one.
                        </p>
                    </template>
                    <template #actions>
                        <ff-button
                            v-ff-tooltip:bottom="!hasPermission('project:create') && 'Your role does not allow creating new instances. Contact a team admin to change your role.'"
                            kind="primary"
                            :to="{name: 'CreateInstance'}"
                            :disabled="!hasPermission('project:create')"
                        >
                            <template #icon-left>
                                <PlusSmallIcon />
                            </template>
                            Create Instance
                        </ff-button>
                    </template>
                </EmptyState>
            </template>
            <template v-else>
                <EmptyState>
                    <template #img>
                        <img src="../../images/empty-states/team-instances.png">
                    </template>
                    <template #header>Hosted Instances Not Available</template>
                    <template #message>
                        <p>
                            Hosted Node-RED Instances are not available on your Team Tier. Please explore upgrade options to enable it.
                        </p>
                    </template>
                </EmptyState>
            </template>
        </div>
        <template v-if="!statusChannelLive">
            <InstanceStatusPolling v-for="instance in instances" :key="instance.id" :instance="instance" @instance-updated="instanceUpdated" />
        </template>
        <ConfirmInstanceDeleteDialog ref="confirmInstanceDeleteDialog" @confirm="onInstanceDeleted" />
    </ff-page>
</template>

<script>
import { PlusSmallIcon } from '@heroicons/vue/24/outline'
import { mapState } from 'pinia'
import { markRaw } from 'vue'

import teamApi from '../../api/team.js'
import EmptyState from '../../components/EmptyState.vue'
import InstanceStatusPolling from '../../components/InstanceStatusPolling.vue'
import FeatureUnavailableToTeam from '../../components/banners/FeatureUnavailableToTeam.vue'
import { useInstanceStates } from '../../composables/InstanceStates.js'
import { useNavigationHelper } from '../../composables/NavigationHelper.js'
import usePermissions from '../../composables/Permissions.js'
import instanceActionsMixin from '../../mixins/InstanceActions.js'
import Alerts from '../../services/alerts.js'
import { InstanceStateMutator } from '../../utils/InstanceStateMutator.js'
import { applyLiveState } from '../../utils/applyLiveState.js'
import { debounce } from '../../utils/eventHandling.js'
import ApplicationLink from '../application/components/cells/ApplicationLink.vue'
import DeploymentName from '../application/components/cells/DeploymentName.vue'
import SimpleTextCell from '../application/components/cells/SimpleTextCell.vue'
import ConfirmInstanceDeleteDialog from '../instance/Settings/dialogs/ConfirmInstanceDeleteDialog.vue'
import DashboardLink from '../instance/components/DashboardLink.vue'
import InstanceEditorLink from '../instance/components/EditorLink.vue'
import InstanceStatusBadge from '../instance/components/InstanceStatusBadge.vue'

import { useAccountSettingsStore } from '@/stores/account-settings.js'
import { useContextStore } from '@/stores/context.js'
import { useLiveStatusStore } from '@/stores/live-status'
import PopoverItem from '@/ui-components/components/PopoverItem.vue'

export default {
    name: 'TeamInstances',
    components: {
        ConfirmInstanceDeleteDialog,
        InstanceStatusPolling,
        InstanceEditorLink,
        DashboardLink,
        PlusSmallIcon,
        EmptyState,
        FeatureUnavailableToTeam,
        PopoverItem
    },
    mixins: [instanceActionsMixin],
    setup () {
        const { isRunningState, statesMap } = useInstanceStates()
        const { navigateTo } = useNavigationHelper()
        const { hasPermission } = usePermissions()

        return { hasPermission, isRunningState, navigateTo, statesMap }
    },
    data () {
        return {
            loading: true,
            fetchSeq: 0,
            instancesMap: new Map(),
            page: 1,
            pageSize: 25,
            totalRows: 0,
            searchTerm: null,
            selectedStatusGroups: [],
            statusFilters: [
                { key: 'running', label: 'Running' },
                { key: 'error', label: 'Error' },
                { key: 'stopped', label: 'Not Running' }
            ],
            sort: {
                key: 'flowLastUpdatedAt',
                order: 'desc'
            },
            columns: [
                { label: 'Name', class: ['grow'], key: 'name', sortable: true, component: { is: markRaw(DeploymentName), map: { url: 'url' }, extraProps: { copyable: true } } },
                {
                    label: 'Status',
                    class: ['w-44'],
                    component: {
                        is: markRaw(InstanceStatusBadge),
                        map: {
                            instanceId: 'id',
                            pendingStateChange: 'pendingStateChange',
                            optimisticStateChange: 'optimisticStateChange',
                            status: 'status'
                        },
                        extraProps: {
                            instanceType: 'instance'
                        }
                    }
                },
                {
                    label: 'Application',
                    class: ['w-72'],
                    key: 'application.name',
                    sortable: true,
                    component: {
                        is: markRaw(ApplicationLink),
                        map: {
                            id: 'application.id',
                            name: 'application.name'
                        }
                    }
                },
                {
                    label: 'Last Updated',
                    class: ['w-60'],
                    key: 'flowLastUpdatedAt',
                    sortable: true,
                    component: {
                        is: markRaw(SimpleTextCell),
                        map: { text: 'flowLastUpdatedSince' }
                    }
                }
            ]
        }
    },
    computed: {
        ...mapState(useContextStore, ['team']),
        ...mapState(useAccountSettingsStore, ['featuresCheck']),
        ...mapState(useLiveStatusStore, { liveInstanceMetadata: 'instanceMetadata', statusChannelLive: 'live' }),
        instances () {
            return Array.from(this.instancesMap.values())
        },
        instancesAvailable () {
            return this.featuresCheck?.isHostedInstancesEnabledForTeam
        },
        paginationProps () {
            return {
                page: this.page,
                pageSize: this.pageSize,
                total: this.totalRows
            }
        },
        statusFilter () {
            if (this.selectedStatusGroups.length === 0) return null
            return this.selectedStatusGroups.flatMap(group => this.statesMap[group] || [])
        },
        hasFilter () {
            return this.searchTerm !== null || this.selectedStatusGroups.length > 0
        }
    },
    watch: {
        team: 'fullReload',
        liveInstanceMetadata: { handler: 'applyLiveStatus', deep: true }
    },
    mounted () {
        const statusParam = this.$route.query.status
        if (statusParam) {
            const groups = Array.isArray(statusParam) ? statusParam : [statusParam]
            this.selectedStatusGroups = groups.filter(group => this.statusFilters.some(f => f.key === group))
        }
        if (this.$route.query.searchQuery) {
            this.searchTerm = this.$route.query.searchQuery
        }
        this.fullReload()
    },
    methods: {
        fullReload () {
            this.page = 1
            this.fetchData()
        },
        async fetchData () {
            if (!this.instancesAvailable) {
                this.loading = false
                return
            }
            if (!this.team.id) {
                return
            }
            const seq = ++this.fetchSeq
            this.loading = true
            try {
                let response
                if (this.hasPermission('team:projects:list')) {
                    response = await teamApi.getInstances(this.team.id, {
                        pagination: {
                            page: this.page,
                            limit: this.pageSize,
                            query: this.searchTerm || null,
                            sort: this.sort.key || null,
                            dir: this.sort.order || null
                        },
                        includeMeta: true,
                        states: this.statusFilter
                    })
                }
                if (seq !== this.fetchSeq) {
                    return
                }
                const projects = response?.projects || []
                this.totalRows = response?.meta?.total ?? response?.count ?? projects.length
                const nextMap = new Map()
                projects.forEach(instance => {
                    instance.running = this.isRunningState(instance.meta?.state || instance.status)
                    instance.notSuspended = (instance.meta?.state || instance.status) !== 'suspended'
                    instance.pendingStateChange = false
                    instance.optimisticStateChange = false
                    instance.canDelete = this.hasPermission('project:delete', { application: instance.application })
                    instance.canChangeStatus = this.hasPermission('project:change-status', { application: instance.application })
                    instance.hideContextMenu = !(instance.canDelete || instance.canChangeStatus)
                    nextMap.set(instance.id, instance)
                })
                this.instancesMap = nextMap
                this.applyLiveStatus()
            } catch (e) {
                if (seq === this.fetchSeq) {
                    Alerts.emit('Failed to load instances.', 'warning')
                }
            } finally {
                if (seq === this.fetchSeq) {
                    this.loading = false
                }
            }
        },
        applyLiveStatus () {
            const metadata = this.liveInstanceMetadata
            for (const id of this.instancesMap.keys()) {
                const meta = metadata[id]
                if (!meta?.status) continue
                const state = meta.status
                const row = this.instancesMap.get(id)
                if (row.status === state && row.meta?.state === state) continue
                this.instancesMap.set(id, {
                    ...applyLiveState(row, state, { versions: meta.versions, clearFlags: true }),
                    running: this.isRunningState(state),
                    notSuspended: state !== 'suspended'
                })
            }
        },
        toggleStatusGroup (key) {
            const index = this.selectedStatusGroups.indexOf(key)
            if (index === -1) {
                this.selectedStatusGroups.push(key)
            } else {
                this.selectedStatusGroups.splice(index, 1)
            }
            this.page = 1
            this.fetchData()
        },
        updateSearch: debounce(function (term) {
            this.searchTerm = term
            this.page = 1
            this.fetchData()
        }, 300),
        updateSort (key, order) {
            this.sort.key = key
            this.sort.order = order
            this.page = 1
            this.fetchData()
        },
        onPageChange (page) {
            this.page = page
            this.fetchData()
        },
        onPageSizeChange (pageSize) {
            this.pageSize = pageSize
            this.page = 1
            this.fetchData()
        },
        openInstance (instance, event) {
            this.navigateTo({
                name: 'Instance',
                params: {
                    id: instance.id
                }
            }, event)
        },
        instanceUpdated: function (newData) {
            const mutator = new InstanceStateMutator(newData)
            mutator.clearState()
            newData.running = this.isRunningState(newData.meta.state)
            newData.notSuspended = newData.meta.state !== 'suspended'
            this.instancesMap.set(newData.id, {
                ...this.instancesMap.get(newData.id),
                ...newData
            })
        },
        onInstanceDeleted (instance) {
            if (this.instancesMap.has(instance.id)) {
                this.instancesMap.delete(instance.id)
                // Refetch to refresh totals and pull in any backfill row from the next page.
                this.fetchData()
            }
        }
    }
}
</script>
