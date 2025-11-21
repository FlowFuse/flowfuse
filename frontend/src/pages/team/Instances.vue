<template>
    <ff-page>
        <template #header>
            <ff-page-header :title="dashboardRoleOnly ? 'Dashboards' : 'Hosted Instances'">
                <template #context>
                    <span v-if="!dashboardRoleOnly">A list of all dashboards belonging to this Team.</span>
                    <span v-else>A list of Node-RED instances with Dashboards belonging to this Team.</span>
                </template>
                <template #help-header>
                    Instances
                </template>
                <template #pictogram>
                    <img src="../../images/pictograms/instance_red.png">
                </template>
                <template #helptext>
                    <p>
                        This is a list of <span v-if="!dashboardRoleOnly">all</span> Node-RED instances belonging to this team running
                        in this FlowFuse.
                    </p>
                    <p>
                        Each Instance is a customised version of Node-RED that includes various
                        FlowFuse plugins to integrate it with the platform.
                    </p>
                    <p v-if="!dashboardRoleOnly">
                        A number of the standard Node-RED settings are exposed for customisation,
                        and they can be preset by applying a Template upon creation of an Instance.
                    </p>
                </template>
            </ff-page-header>
        </template>
        <div class="space-y-6">
            <div class="banner-wrapper">
                <FeatureUnavailableToTeam v-if="!instancesAvailable" />
            </div>
            <ff-loading v-if="loading" message="Loading Instances..." />
            <template v-else-if="instancesAvailable">
                <ff-data-table
                    v-if="instances.length > 0"
                    data-el="instances-table" :columns="columns" :rows="instances" :show-search="true"
                    search-placeholder="Search Instances..."
                    initialSortKey="flowLastUpdatedAt" initialSortOrder="desc"
                    :rows-selectable="!dashboardRoleOnly"
                    @row-selected="openInstance"
                >
                    <template #actions>
                        <ff-button
                            v-ff-tooltip:left="!hasPermission('project:create') && 'Your role does not allow creating new instances. Contact a team admin to change your role.'"
                            data-action="create-project"
                            kind="primary"
                            :to="{name: 'CreateInstance'}"
                            :disabled="!hasPermission('project:create')"
                        >
                            <template #icon-left>
                                <PlusSmIcon />
                            </template>
                            Create Instance
                        </ff-button>
                    </template>
                    <template #row-actions="{row}">
                        <dashboard-link v-if="!!row.settings?.dashboard2UI?.length" :disabled="row.meta?.state !== 'running'" :instance="row" />
                        <instance-editor-link
                            v-if="hasPermission('team:projects:list')"
                            :instance="row"
                            :disabled="row.meta?.state !== 'running'"
                            disabled-reason="The Instance is not running"
                        />
                    </template>
                    <template
                        #context-menu="{row}"
                    >
                        <ff-list-item
                            v-if="row.canChangeStatus"
                            :disabled="row.pendingStateChange || row.running || row.optimisticStateChange"
                            label="Start"
                            @click.stop="instanceStart(row)"
                        />

                        <ff-list-item
                            v-if="row.canChangeStatus"
                            :disabled="!row.notSuspended"
                            label="Restart"
                            @click.stop="instanceRestart(row)"
                        />

                        <ff-list-item
                            v-if="row.canChangeStatus"
                            :disabled="!row.notSuspended"
                            kind="danger"
                            label="Suspend"
                            @click.stop="instanceShowConfirmSuspend(row)"
                        />

                        <ff-list-item
                            v-if="row.canDelete"
                            kind="danger"
                            label="Delete"
                            @click.stop="instanceShowConfirmDelete(row)"
                        />
                    </template>
                </ff-data-table>
                <EmptyState v-else-if="!dashboardRoleOnly">
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
                                <PlusSmIcon />
                            </template>
                            Create Instance
                        </ff-button>
                    </template>
                </EmptyState>
                <EmptyState v-else>
                    <template #img>
                        <img src="../../images/empty-states/team-instances.png">
                    </template>
                    <template #header>There are no dashboards in this team.</template>
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
        <InstanceStatusPolling v-for="instance in instances" :key="instance.id" :instance="instance" @instance-updated="instanceUpdated" />
        <ConfirmInstanceDeleteDialog ref="confirmInstanceDeleteDialog" @confirm="onInstanceDeleted" />
    </ff-page>
</template>

<script>
import { PlusSmIcon } from '@heroicons/vue/outline'
import { markRaw } from 'vue'
import { mapGetters } from 'vuex'

import instanceApi from '../../api/instances.js'
import teamApi from '../../api/team.js'
import EmptyState from '../../components/EmptyState.vue'
import InstanceStatusPolling from '../../components/InstanceStatusPolling.vue'
import FeatureUnavailableToTeam from '../../components/banners/FeatureUnavailableToTeam.vue'
import { useInstanceStates } from '../../composables/InstanceStates.js'
import { useNavigationHelper } from '../../composables/NavigationHelper.js'
import usePermissions from '../../composables/Permissions.js'
import instanceActionsMixin from '../../mixins/InstanceActions.js'
import { InstanceStateMutator } from '../../utils/InstanceStateMutator.js'
import DeploymentName from '../application/components/cells/DeploymentName.vue'
import SimpleTextCell from '../application/components/cells/SimpleTextCell.vue'
import ConfirmInstanceDeleteDialog from '../instance/Settings/dialogs/ConfirmInstanceDeleteDialog.vue'
import DashboardLink from '../instance/components/DashboardLink.vue'
import InstanceEditorLink from '../instance/components/EditorLink.vue'
import InstanceStatusBadge from '../instance/components/InstanceStatusBadge.vue'

export default {
    name: 'TeamInstances',
    components: {
        ConfirmInstanceDeleteDialog,
        InstanceStatusPolling,
        InstanceEditorLink,
        DashboardLink,
        PlusSmIcon,
        EmptyState,
        FeatureUnavailableToTeam
    },
    mixins: [instanceActionsMixin],
    props: {
        dashboardRoleOnly: {
            required: false,
            default: false,
            type: Boolean
        }
    },
    setup () {
        const { isRunningState } = useInstanceStates()
        const { navigateTo } = useNavigationHelper()
        const { hasPermission } = usePermissions()

        return { hasPermission, isRunningState, navigateTo }
    },
    data () {
        return {
            loading: false,
            instancesMap: new Map(),
            columns: [
                { label: 'Name', class: ['flex-grow'], key: 'name', sortable: true, component: { is: markRaw(DeploymentName) } },
                {
                    label: 'Status',
                    class: ['w-44'],
                    sortable: true,
                    component: {
                        is: markRaw(InstanceStatusBadge),
                        map: {
                            instanceId: 'id',
                            pendingStateChange: 'pendingStateChange',
                            optimisticStateChange: 'optimisticStateChange',
                            status: 'meta.state'
                        },
                        extraProps: {
                            instanceType: 'instance'
                        }
                    }
                },
                { label: 'Application', class: ['grow-[0.25]'], key: 'application.name', sortable: true },
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
        ...mapGetters('account', ['featuresCheck', 'team']),
        instances () {
            return Array.from(this.instancesMap.values())
        },
        instancesAvailable () {
            return this.featuresCheck?.isHostedInstancesEnabledForTeam
        }
    },
    watch: {
        team: 'fetchData'
    },
    mounted () {
        this.fetchData()
    },
    methods: {
        fetchData: async function () {
            this.loading = true
            let promise
            if (this.team.id && this.instancesAvailable) {
                if (this.hasPermission('team:projects:list')) {
                    promise = teamApi.getTeamInstances(this.team.id)
                } else if (this.hasPermission('team:read')) {
                    promise = teamApi.getTeamDashboards(this.team.id)
                }

                promise.then(response => response.projects)
                    .then((projects) => {
                        projects.forEach(instance => {
                            instance.running = this.isRunningState(instance.status)
                            instance.notSuspended = instance.status !== 'suspended'
                            instance.pendingStateChange = false
                            instance.optimisticStateChange = false
                            instance.canDelete = this.hasPermission('project:delete', { application: instance.application })
                            instance.canChangeStatus = this.hasPermission('project:change-status', { application: instance.application })
                            instance.hideContextMenu = !(instance.canDelete || instance.canChangeStatus)
                            this.instancesMap.set(instance.id, instance)
                        })
                    })
                    .then(() => this.getInstanceMeta())
                    .catch(e => e)
                    .finally(() => {
                        this.loading = false
                    })

                this.getInstanceMeta()
            } else {
                this.loading = false
            }
        },
        getInstanceMeta () {
            const promises = []
            this.instances.forEach(i => {
                promises.push(instanceApi.getStatus(i.id)
                    .then(res => {
                        if (this.instancesMap.has(res.id)) {
                            res.running = this.isRunningState(res.meta.state)
                            res.notSuspended = res.meta.state !== 'suspended'
                            this.instancesMap.set(res.id, {
                                ...this.instancesMap.get(res.id),
                                ...res
                            })
                        }
                    }))
            })
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
            }
        }
    }
}
</script>
