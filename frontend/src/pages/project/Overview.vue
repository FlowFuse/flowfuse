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
                <ff-button @click="addInstance()">
                    <template v-slot:icon-left><PlusSmIcon /></template>
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
                    #context-menu
                >
                    <ff-list-item
                        :disabled="project.pendingStateChange || projectRunning"
                        label="Start"
                        @click.stop="$emit('project-start')"
                    />

                    <ff-list-item
                        :disabled="!projectNotSuspended"
                        label="Restart"
                        @click.stop="$emit('project-restart')"
                    />

                    <ff-list-item
                        :disabled="!projectNotSuspended"
                        kind="danger"
                        label="Suspend"
                        @click.stop="$emit('project-suspend')"
                    />

                    <ff-list-item
                        v-if="hasPermission('project:delete')"
                        kind="danger"
                        label="Delete"
                        @click.stop="$emit('project-delete')"
                    />
                </template>
            </ff-data-table>
        </div>
    </div>
</template>

<script>
import { Roles } from '@core/lib/roles'

import { markRaw } from 'vue'
import { mapState } from 'vuex'

import { PlusSmIcon } from '@heroicons/vue/outline'

import SectionTopMenu from '../../components/SectionTopMenu'

import ProjectStatusBadge from './components/ProjectStatusBadge'
import DeploymentName from './components/cells/DeploymentName.vue'

import LastSeen from './components/cells/LastSeen.vue'
import ProjectEditorLink from './components/cells/ProjectEditorLink.vue'

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
    emits: ['project-delete', 'project-suspend', 'project-restart', 'project-start', 'instances-enable-polling', 'instances-disable-polling'],
    computed: {
        ...mapState('account', ['team', 'teamMembership']),
        cloudColumns () {
            return [
                { label: 'Name', class: ['w-64'], component: { is: markRaw(DeploymentName), map: { disabled: 'editorDisabled' } } },
                { label: 'Last Deployed', class: ['w-48'], component: { is: markRaw(LastSeen), map: { lastSeenSince: 'flowLastUpdatedSince' } } },
                { label: 'Deployment Status', class: ['w-48'], component: { is: markRaw(ProjectStatusBadge), map: { status: 'meta.state' } } },
                { label: '', class: ['w-20'], component: { is: markRaw(ProjectEditorLink), map: { disabled: 'editorDisabled' } } }
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
        loadInstances () {

        },
        selectedCloudRow (cloudInstance) {
            this.$router.push({
                name: 'Instance',
                params: {
                    id: cloudInstance.id
                }
            })
        },
        addInstance () {
            // placeholder before full functionality is available
            Dialog.show({
                header: 'Multiple Instances per Application - Coming Soon!',
                html: `<p>We've not quite got this part ready just yet, but soon, you will be able to manage multiple instances of Node-RED within a single "Application".</p><p>This will enable <b>DevOps Pipelines, High Availability, and much more</b>. You can read more about what we have planned <a href="https://github.com/flowforge/flowforge/issues/1689" target="_blank">here.</a></p><p>For now, Applications and Instances are still mapped 1:1, so you can still add new instances of Node-RED from the <a href="/team/${this.team.slug}/projects">Applications</a> page.</p>`
            })
        }
    }
}
</script>
