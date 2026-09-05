<template>
    <ff-page>
        <template #header>
            <ff-page-header :title="$t('ui.hostedInstances')">
                <template #context>
                    <span>{{ $t('ui.aListOfAllNodeRedInstancesBelongingToThisTeam') }}</span>
                </template>
                <template #help-header>
                    {{ $t('ui.instances') }}
                </template>
                <template #pictogram>
                    <img src="../../images/pictograms/instance_red.png">
                </template>
                <template #helptext>
                    <p>
                        {{ $t('ui.thisIsAListOfAllNodeRedInstancesBelongingToThisT') }}
                    </p>
                    <p>
                        {{ $t('ui.eachInstanceIsACustomisedVersionOfNodeRedThatInc') }}
                    </p>
                    <p>
                        {{ $t('ui.aNumberOfTheStandardNodeRedSettingsAreExposedFor') }}
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
                    :search-placeholder="$t('ui.searchByName')"
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
                            :to="{name: 'team-instance-create'}"
                            :disabled="!hasPermission('project:create')"
                        >
                            <template #icon-left>
                                <PlusSmallIcon />
                            </template>
                            {{ $t('ui.createInstance') }}
                        </ff-button>
                    </template>
                    <template #row-actions="{row}">
                        <dashboard-link v-if="!!row.settings?.dashboard2UI?.length" :disabled="row.status !== 'running'" :instance="row" scope="team" />
                        <instance-editor-link
                            v-if="hasPermission('team:projects:list')"
                            :instance="row"
                            :disabled="row.status !== 'running'"
                            :disabled-reason="$t('ui.theInstanceIsNotRunning')"
                        />
                    </template>
                    <template
                        #context-menu="{row}"
                    >
                        <ff-kebab-item
                            v-if="row.canChangeStatus"
                            :disabled="row.pendingStateChange || row.running || row.optimisticStateChange"
                            :label="$t('ui.start')"
                            @click.stop="instanceStart(row)"
                        />

                        <ff-kebab-item
                            v-if="row.canChangeStatus"
                            :disabled="!row.notSuspended"
                            :label="$t('ui.restart')"
                            @click.stop="instanceRestart(row)"
                        />

                        <ff-kebab-item
                            v-if="row.canChangeStatus"
                            :disabled="!row.notSuspended"
                            kind="danger"
                            :label="$t('ui.suspend')"
                            @click.stop="instanceShowConfirmSuspend(row)"
                        />

                        <ff-kebab-item
                            v-if="row.canDelete"
                            kind="danger"
                            :label="$t('ui.delete')"
                            @click.stop="instanceShowConfirmDelete(row)"
                        />
                    </template>
                </ff-data-table>
                <EmptyState v-else>
                    <template #img>
                        <img src="../../images/empty-states/team-instances.png">
                    </template>
                    <template #header>{{ $t('ui.getStartedWithYourFirstNodeRedInstance') }}</template>
                    <template #message>
                        <p>
                            {{ $t('ui.instancesAreManagedInFlowfuseVia') }} <ff-team-link
                                class="ff-link"
                                :to="{name:'team-applications', params: {team_slug: team.slug}}"
                            >
                                {{ $t('ui.applications') }}
                            </ff-team-link>.
                        </p>
                        <p>
                            {{ $t('ui.youCanCreateYourFirstInstanceWhenCreatingYourFir') }}
                        </p>
                    </template>
                    <template #actions>
                        <ff-button
                            v-ff-tooltip:bottom="!hasPermission('project:create') && 'Your role does not allow creating new instances. Contact a team admin to change your role.'"
                            kind="primary"
                            :to="{name: 'team-instance-create'}"
                            :disabled="!hasPermission('project:create')"
                        >
                            <template #icon-left>
                                <PlusSmallIcon />
                            </template>
                            {{ $t('ui.createInstance') }}
                        </ff-button>
                    </template>
                </EmptyState>
            </template>
            <template v-else>
                <EmptyState>
                    <template #img>
                        <img src="../../images/empty-states/team-instances.png">
                    </template>
                    <template #header>{{ $t('ui.hostedInstancesNotAvailable') }}</template>
                    <template #message>
                        <p>
                            {{ $t('ui.hostedNodeRedInstancesAreNotAvailableOnYourTeamT') }}
                        </p>
                    </template>
                </EmptyState>
            </template>
        </div>
        <template v-if="!statusChannelLive">
            <InstanceStatusPolling v-for="instance in currentPageInstanceRefs" :key="instance.id" :instance="instance" @instance-updated="instanceUpdated" />
        </template>
        <ConfirmInstanceDeleteDialog ref="confirmInstanceDeleteDialog" @confirm="onInstanceDeleted" />
    </ff-page>
</template>

<script>
import { PlusSmallIcon } from '@heroicons/vue/24/outline'
import { mapActions, mapState } from 'pinia'
import { markRaw } from 'vue'

import EmptyState from '../../components/EmptyState.vue'
import InstanceStatusPolling from '../../components/InstanceStatusPolling.vue'
import FeatureUnavailableToTeam from '../../components/banners/FeatureUnavailableToTeam.vue'
import { useInstanceStates } from '../../composables/InstanceStates.js'
import { useNavigationHelper } from '../../composables/NavigationHelper.js'
import usePermissions from '../../composables/Permissions.js'
import { t } from '../../i18n.js'
import Alerts from '../../services/alerts.js'
import Dialog from '../../services/dialog.js'
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
import { useDataFarmHostedInstancesStore } from '@/stores/data-farm-hosted-instances'
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
    setup () {
        const { statesMap } = useInstanceStates()
        const { navigateTo } = useNavigationHelper()
        const { hasPermission } = usePermissions()

        return { hasPermission, navigateTo, statesMap }
    },
    data () {
        return {
            loading: true,
            abortController: null,
            page: 1,
            pageSize: 25,
            searchTerm: null,
            selectedStatusGroups: [],
            statusFilters: [
                { key: 'running', label: t('ui.running') },
                { key: 'error', label: t('ui.error2') },
                { key: 'stopped', label: t('ui.notRunning') }
            ],
            sort: {
                key: 'flowLastUpdatedAt',
                order: 'desc'
            },
            columns: [
                { label: t('ui.name'), class: ['grow'], key: 'name', sortable: true, component: { is: markRaw(DeploymentName), map: { url: 'url' }, extraProps: { copyable: true } } },
                {
                    label: t('ui.status'),
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
                    label: t('ui.application'),
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
                    label: t('ui.lastUpdated'),
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
        ...mapState(useDataFarmHostedInstancesStore, { currentPageInstances: 'currentPageInstances', currentPageInstanceRefs: 'currentPageInstanceRefs', totalRows: 'total' }),
        instances () {
            return this.currentPageInstances.map(instance => {
                const canDelete = this.hasPermission('project:delete', { application: instance.application })
                const canChangeStatus = this.hasPermission('project:change-status', { application: instance.application })
                return { ...instance, canDelete, canChangeStatus, hideContextMenu: !(canDelete || canChangeStatus) }
            })
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
    beforeUnmount () {
        this.abortController?.abort()
    },
    methods: {
        ...mapActions(useDataFarmHostedInstancesStore, [
            'fetchTeamInstancesPage',
            'applyLiveStatus',
            'applyPolledStatus',
            'startInstance',
            'restartInstance',
            'suspendInstance',
            'removeInstance',
            'reset'
        ]),
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
            this.abortController?.abort()
            const controller = markRaw(new AbortController())
            this.abortController = controller
            this.loading = true
            try {
                if (this.hasPermission('team:projects:list')) {
                    await this.fetchTeamInstancesPage(this.team.id, {
                        page: this.page,
                        limit: this.pageSize,
                        query: this.searchTerm || null,
                        sort: this.sort.key || null,
                        dir: this.sort.order || null,
                        states: this.statusFilter,
                        signal: controller.signal
                    })
                    this.applyLiveStatus()
                } else {
                    this.reset()
                }
            } catch (error) {
                if (error.name !== 'AbortError' && error.name !== 'CanceledError') {
                    Alerts.emit('Failed to load instances.', 'warning')
                }
            } finally {
                if (!controller.signal.aborted) {
                    this.loading = false
                    this.abortController = null
                }
            }
        },
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
                name: 'instance',
                params: {
                    id: instance.id
                }
            }, event)
        },
        async instanceStart (instance) {
            try {
                await this.startInstance(instance.id)
            } catch (err) {
                console.warn('Instance start failed.', err)
                Alerts.emit('Instance start failed.', 'warning')
            }
        },
        async instanceRestart (instance) {
            try {
                await this.restartInstance(instance.id)
            } catch (err) {
                console.warn('Instance restart failed.', err)
                Alerts.emit('Instance restart failed.', 'warning')
            }
        },
        instanceShowConfirmSuspend (instance) {
            Dialog.show({
                header: t('ui.suspendInstance'),
                text: `Are you sure you want to suspend ${instance.name}`,
                confirmLabel: 'Suspend',
                kind: 'danger'
            }, async () => {
                try {
                    await this.suspendInstance(instance.id)
                    Alerts.emit('Instance suspend request succeeded.', 'confirmation')
                } catch (err) {
                    console.warn(err)
                    Alerts.emit('Instance failed to suspend.', 'warning')
                }
            })
        },
        instanceShowConfirmDelete (instance) {
            this.$refs.confirmInstanceDeleteDialog.show(instance)
        },
        instanceUpdated (newData) {
            this.applyPolledStatus(newData)
        },
        onInstanceDeleted (instance) {
            this.removeInstance(instance.id)
            // Refetch to refresh totals and pull in any backfill row from the next page.
            this.fetchData()
        }
    }
}
</script>
