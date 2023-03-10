<template>
    <div>
        <SectionTopMenu hero="FlowForge Hosted Instances" help-header="FlowForge - Instances - Local" info="Instances of Node-RED running in the FlowForge cloud">
            <template #pictogram>
                <img src="../../images/pictograms/edge_red.png">
            </template>
            <template #helptext>
                <p>This is a list of all instances of this Application hosted on the same domain as FlowForge.</p>
                <p>It will always run the latest flow deployed in Node-RED and use the latest credentials and runtime settings defined in the Projects settings.</p>
                <p>To edit an Applications flow, open the editor of the Instance.</p>
            </template>
            <template #tools>
                <ff-button v-if="hasPermission('project:create')" data-action="create-project-1" kind="primary" size="small" :to="`/team/${team.slug}/projects/create`" data-nav="create-instance"><template #icon-left><PlusSmIcon /></template>Create Instance</ff-button>
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

        <SectionTopMenu hero="Remote Instances" help-header="FlowForge - Instances - Remote" info="Devices running the FlowForge Device Agent assigned to instances in this Application">
            <template #pictogram>
                <img src="../../images/pictograms/edge_red.png">
            </template>
            <template #helptext>
                <p>
                    FlowForge enables the deployment and management of remote instances of Node-RED via "Devices".
                </p>
                <p>
                    Here you will see all Devices attached to instances of this application.
                    When you set a new Target Snapshot, that will get deployed,
                    using the <a href="https://flowforge.com/docs/user/devices/" target="_blank">FlowForge Device Agent</a>, out to all connected devices.
                </p>
                <p>
                    Here, you can see a picture of the last time the device was online, and the status of the Node-RED
                    flows on those devices at that point in time.
                </p>
            </template>
        </SectionTopMenu>

        <DevicesBrowser
            :application="project"
            :team="team"
            :teamMembership="teamMembership"
            @project-updated="$emit('projectUpdated', ...arguments)"
        />
    </div>
</template>

<script>

import { Roles } from '@core/lib/roles'
import { PlusSmIcon } from '@heroicons/vue/solid'

import { markRaw } from 'vue'
import { mapState } from 'vuex'

import SectionTopMenu from '../../components/SectionTopMenu'

import DevicesBrowser from './DevicesBrowser'
import ProjectStatusBadge from './components/ProjectStatusBadge'
import DeploymentName from './components/cells/DeploymentName.vue'

import LastSeen from './components/cells/LastSeen.vue'
import ProjectEditorLink from './components/cells/ProjectEditorLink.vue'

import permissionsMixin from '@/mixins/Permissions'

export default {
    name: 'ProjectOverview',
    components: {
        DevicesBrowser,
        PlusSmIcon,
        SectionTopMenu
    },
    mixins: [permissionsMixin],
    inheritAttrs: false,
    props: {
        project: {
            type: Object,
            required: true
        }
    },
    emits: ['project-delete', 'project-suspend', 'project-restart', 'project-start', 'projectUpdated'],
    computed: {
        ...mapState('account', ['team', 'teamMembership']),
        cloudColumns () {
            return [
                { label: 'Name', class: ['w-64'], component: { is: markRaw(DeploymentName), extraProps: { disabled: !this.projectRunning || this.isVisitingAdmin } } },
                { label: 'Last Deployed', class: ['w-48'], component: { is: markRaw(LastSeen), map: { lastSeenSince: 'flowLastUpdatedSince' } } },
                { label: 'Deployment Status', class: ['w-48'], component: { is: markRaw(ProjectStatusBadge), map: { status: 'meta.state' } } },
                { label: '', class: ['w-20'], component: { is: markRaw(ProjectEditorLink), extraProps: { disabled: !this.projectRunning || this.isVisitingAdmin } } }
            ]
        },
        cloudRows () {
            return this.project.id ? [this.project] : []
        },
        projectRunning () {
            return this.project.meta?.state === 'running'
        },
        projectNotSuspended () {
            return this.project.meta?.state !== 'suspended'
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
