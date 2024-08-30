<template>
    <ff-page>
        <template #header>
            <ff-page-header title="Instances">
                <template #context>
                    A list of all Node-RED instances belonging to this Team.
                </template>
                <template #help-header>
                    Instances
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
        <div class="space-y-6">
            <ff-loading v-if="loading" message="Loading Instances..." />
            <template v-else>
                <ff-data-table
                    v-if="instances.length > 0"
                    data-el="instances-table" :columns="columns" :rows="instances" :show-search="true" search-placeholder="Search Instances..."
                    :rows-selectable="true" @row-selected="openInstance"
                >
                    <template #actions>
                        <ff-button
                            v-if="hasPermission('project:create')"
                            data-action="create-project"
                            kind="primary"
                            :to="{name: 'CreateInstance'}"
                        >
                            <template #icon-left>
                                <PlusSmIcon />
                            </template>
                            Create Instance
                        </ff-button>
                    </template>
                    <template #row-actions="{row}">
                        <dashboard-link :instance="row" :hidden="!row.settings?.dashboard2UI" />
                        <instance-editor-link
                            :instance="row"
                            :disabled="row.status !== 'running'"
                            disabled-reason="The Instance is not running"
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
                            Instances are managed in FlowFuse via <router-link
                                class="ff-link"
                                :to="{name:'Applications', params: {team_slug: team.slug}}"
                            >
                                Applications
                            </router-link>.
                        </p>
                        <p>
                            You can create your first Instance when creating your first Application, or add an Instance to an existing Application if you have one.
                        </p>
                    </template>
                    <template #actions>
                        <ff-button
                            v-if="hasPermission('project:create')"
                            kind="primary"
                            :to="{name: 'CreateInstance'}"
                        >
                            <template #icon-left>
                                <PlusSmIcon />
                            </template>
                            Create Instance
                        </ff-button>
                    </template>
                </EmptyState>
            </template>
        </div>
    </ff-page>
</template>

<script>
import { PlusSmIcon } from '@heroicons/vue/outline'
import { markRaw } from 'vue'

import teamApi from '../../api/team.js'
import EmptyState from '../../components/EmptyState.vue'
import permissionsMixin from '../../mixins/Permissions.js'
import DeploymentName from '../application/components/cells/DeploymentName.vue'
import SimpleTextCell from '../application/components/cells/SimpleTextCell.vue'
import DashboardLink from '../instance/components/DashboardLink.vue'
import InstanceEditorLink from '../instance/components/EditorLink.vue'
import InstanceStatusBadge from '../instance/components/InstanceStatusBadge.vue'

export default {
    name: 'TeamInstances',
    components: {
        InstanceEditorLink,
        DashboardLink,
        PlusSmIcon,
        EmptyState
    },
    mixins: [permissionsMixin],
    data () {
        return {
            loading: false,
            instances: [],
            columns: [
                { label: 'Name', class: ['flex-grow'], key: 'name', sortable: true, component: { is: markRaw(DeploymentName) } },
                { label: 'Status', class: ['w-44'], key: 'status', sortable: true, component: { is: markRaw(InstanceStatusBadge) } },
                { label: 'Application', class: ['flex-grow-[0.25]'], key: 'application.name', sortable: true },
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
                // {
                //     label: '',
                //     sortable: false,
                //     component: {
                //         is: markRaw(DashboardLinkCell),
                //         map: { instance: 'instance', hidden: 'hideDashboard2Button' }
                //     }
                // },
                // {
                //     label: '',
                //     component: {
                //         is: markRaw(InstanceEditorLinkCell),
                //         map: { instance: 'instance' }
                //     }
                // }
            ]
        }
    },
    watch: {
        team: 'fetchData'
    },
    mounted () {
        this.fetchData()
    },
    methods: {
        fetchData: async function (newVal) {
            this.loading = true
            if (this.team.id) {
                if (this.hasPermission('team:projects:list')) {
                    this.instances = (await teamApi.getTeamInstances(this.team.id)).projects
                } else if (this.hasPermission('team:read')) {
                    this.instances = (await teamApi.getTeamDashboards(this.team.id)).projects
                }
            }
            this.loading = false
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
