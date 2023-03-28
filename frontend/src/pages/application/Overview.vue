<template>
    <div>
        <SectionTopMenu hero="Node-RED Instances" help-header="Node-RED Instances - Running in FlowForge" info="Instances of Node-RED, in this application, that are running in the FlowForge cloud.">
            <template #pictogram>
                <img src="../../images/pictograms/edge_red.png">
            </template>
            <template #helptext>
                <p>This is a list of all instances of this Application hosted on the same domain as FlowForge.</p>
                <p>It will always run the latest flow deployed in Node-RED and use the latest credentials and runtime settings defined in the Projects settings.</p>
                <p>To edit an Application's flow, open the editor of the Instance.</p>
            </template>
            <template #tools>
                <ff-button
                    :to="{ name: 'ApplicationCreateInstance' }"
                >
                    <template #icon-left><PlusSmIcon /></template>
                    Add Instance
                </ff-button>
            </template>
        </SectionTopMenu>

        <div class="space-y-6 mb-12">
            <ff-data-table
                data-el="cloud-instances"
                :columns="cloudColumns"
                :rows="cloudRows"
                :rows-selectable="true"
                @row-selected="selectedCloudRow"
            >
                <template v-if="instances?.length === 0" #table>
                    <div class="ff-no-data ff-no-data-large">
                        This application does not have any instances yet.
                    </div>
                </template>

                <template
                    v-if="hasPermission('device:edit')"
                    #context-menu="{row}"
                >
                    <ff-list-item
                        :disabled="row.pendingStateChange || row.projectRunning"
                        label="Start"
                        @click.stop="$emit('instance-start', row)"
                    />

                    <ff-list-item
                        :disabled="!row.projectNotSuspended"
                        label="Restart"
                        @click.stop="$emit('instance-restart', row)"
                    />

                    <ff-list-item
                        :disabled="!row.projectNotSuspended"
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
        </div>
    </div>
</template>

<script>
import { Roles } from '@core/lib/roles'

import { PlusSmIcon } from '@heroicons/vue/outline'
import { markRaw } from 'vue'
import { mapState } from 'vuex'

import SectionTopMenu from '../../components/SectionTopMenu'

import InstanceStatusBadge from '../instance/components/InstanceStatusBadge'
import InstanceEditorLink from '../instance/components/cells/InstanceEditorLink'

import DeploymentName from './components/cells/DeploymentName.vue'
import LastSeen from './components/cells/LastSeen.vue'

import permissionsMixin from '@/mixins/Permissions'
import Dialog from '@/services/dialog'

export default {
    name: 'ProjectOverview',
    components: {
        PlusSmIcon,
        SectionTopMenu
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
    emits: ['instance-delete', 'instance-suspend', 'instance-restart', 'instance-start', 'instances-enable-polling', 'instances-disable-polling'],
    computed: {
        ...mapState('account', ['team', 'teamMembership']),
        cloudColumns () {
            return [
                { label: 'Name', class: ['w-64'], component: { is: markRaw(DeploymentName), map: { disabled: 'editorDisabled' } } },
                { label: 'Last Deployed', class: ['w-48'], component: { is: markRaw(LastSeen), map: { lastSeenSince: 'flowLastUpdatedSince' } } },
                { label: 'Deployment Status', class: ['w-48'], component: { is: markRaw(InstanceStatusBadge), map: { status: 'meta.state' } } },
                { label: '', class: ['w-20'], component: { is: markRaw(InstanceEditorLink), map: { disabled: 'editorDisabled', url: 'meta.url' } } }
            ]
        },
        cloudRows () {
            return this.instances.map((instance) => {
                instance.running = instance.meta?.state === 'running'
                instance.notSuspended = instance.meta?.state !== 'suspended'

                instance.editorDisabled = !instance.running || this.isVisitingAdmin

                return instance
            })
        },
        isVisitingAdmin () {
            return this.teamMembership.role === Roles.Admin
        }
    },
    mounted () {
        this.$emit('instances-enable-polling')
    },
    unmounted () {
        this.$emit('instances-disable-polling')
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
