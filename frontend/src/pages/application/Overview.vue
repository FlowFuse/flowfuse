<template>
    <div>
        <SectionTopMenu hero="Node-RED Instances" help-header="Node-RED Instances - Running in FlowFuse" info="Instances of Node-RED belonging to this application.">
            <template #pictogram>
                <img src="../../images/pictograms/edge_red.png">
            </template>
            <template #helptext>
                <p>This is a list of Node-RED instances in this Application, hosted on the same domain as FlowFuse.</p>
                <p>It will always run the latest flow deployed in Node-RED and use the latest credentials and runtime settings defined in the Projects settings.</p>
                <p>To edit an Application's flow, open the editor of the Instance.</p>
            </template>
            <template #tools>
                <ff-button
                    data-action="create-instance"
                    :to="{ name: 'ApplicationCreateInstance' }"
                >
                    <template #icon-left><PlusSmIcon /></template>
                    Add Instance
                </ff-button>
            </template>
        </SectionTopMenu>

        <div class="space-y-6 mb-12">
            <ff-data-table
                v-if="instances?.length > 0"
                data-el="cloud-instances"
                :columns="cloudColumns"
                :rows="cloudRows"
                :rows-selectable="true"
                @row-selected="selectedCloudRow"
            >
                <template
                    v-if="hasPermission('device:edit')"
                    #context-menu="{row}"
                >
                    <ff-list-item
                        :disabled="row.pendingStateChange || row.running"
                        label="Start"
                        @click.stop="$emit('instance-start', row)"
                    />

                    <ff-list-item
                        :disabled="!row.notSuspended"
                        label="Restart"
                        @click.stop="$emit('instance-restart', row)"
                    />

                    <ff-list-item
                        :disabled="!row.notSuspended"
                        kind="danger"
                        label="Suspend"
                        @click.stop="$emit('instance-suspend', row)"
                    />

                    <ff-list-item
                        v-if="hasPermission('project:delete')"
                        kind="danger"
                        label="Delete"
                        @click.stop="$emit('instance-delete', row)"
                    />
                </template>
            </ff-data-table>
            <EmptyState v-else>
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
                        :to="{ name: 'ApplicationCreateInstance' }"
                    >
                        <template #icon-left><PlusSmIcon /></template>
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
        </div>
    </div>
</template>

<script>

import { PlusSmIcon } from '@heroicons/vue/outline'
import { markRaw } from 'vue'
import { mapState } from 'vuex'

import { Roles } from '../../../../forge/lib/roles.js'

import EmptyState from '../../components/EmptyState.vue'
import SectionTopMenu from '../../components/SectionTopMenu.vue'

import permissionsMixin from '../../mixins/Permissions.js'
import InstanceStatusBadge from '../instance/components/InstanceStatusBadge.vue'
import DashboardLinkCell from '../instance/components/cells/DashboardLink.vue'
import InstanceEditorLinkCell from '../instance/components/cells/InstanceEditorLink.vue'

import DeploymentName from './components/cells/DeploymentName.vue'
import LastSeen from './components/cells/LastSeen.vue'

export default {
    name: 'ProjectOverview',
    components: {
        PlusSmIcon,
        SectionTopMenu,
        EmptyState
    },
    mixins: [permissionsMixin],
    inheritAttrs: false,
    props: {
        application: {
            type: Object,
            required: true
        },
        instances: {
            type: Array,
            required: true
        }
    },
    emits: ['instance-delete', 'instance-suspend', 'instance-restart', 'instance-start'],
    computed: {
        ...mapState('account', ['team', 'teamMembership']),
        cloudColumns () {
            return [
                { label: 'Name', class: ['w-1/2'], component: { is: markRaw(DeploymentName) } },
                { label: 'Instance Status', class: ['w-1/5'], component: { is: markRaw(InstanceStatusBadge), map: { status: 'meta.state' } } },
                { label: 'Last Deployed', class: ['w-1/5'], component: { is: markRaw(LastSeen), map: { lastSeenSince: 'flowLastUpdatedSince' } } },
                { label: '', component: { is: markRaw(DashboardLinkCell), map: { instance: '_self', hidden: 'hideDashboard2Button' } } },
                { label: '', component: { is: markRaw(InstanceEditorLinkCell) } }
            ]
        },
        cloudRows () {
            return this.instances.map((instance) => {
                instance.running = instance.meta?.state === 'running'
                instance.notSuspended = instance.meta?.state !== 'suspended'
                instance.isHA = instance.ha?.replicas !== undefined
                instance.disabled = !instance.running || this.isVisitingAdmin || instance.isHA
                instance._self = instance
                instance.hideDashboard2Button = !instance.settings?.dashboard2UI
                return instance
            })
        },
        isVisitingAdmin () {
            return this.teamMembership.role === Roles.Admin
        }
    },
    methods: {
        selectedCloudRow (cloudInstance) {
            this.$router.push({
                name: 'Instance',
                params: {
                    id: cloudInstance.id
                }
            })
        }
    }
}
</script>
