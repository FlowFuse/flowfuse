<template>
    <SectionTopMenu v-if="!isProjectDeviceView" hero="Devices">
        <template v-slot:tools>
            <ff-button v-if="addDeviceEnabled" kind="primary" size="small" @click="showCreateDeviceDialog"><template v-slot:icon-left><PlusSmIcon /></template>Register Device</ff-button>
        </template>
    </SectionTopMenu>
    <form class="space-y-6">
        <ff-loading v-if="loading" message="Loading Devices..." />
        <template v-else-if="devices.length > 0">
            <template v-if="isProjectDeviceView">
                <div class="flex space-x-8">
                    <ff-button kind="primary" size="small" @click="showCreateDeviceDialog"><template v-slot:icon-left><PlusSmIcon /></template>Register Device</ff-button>
                    <ff-button kind="tertiary" size="small" to="./snapshots"><template v-slot:icon-left><ClockIcon/></template>Target Snapshot: {{project.deviceSettings.targetSnapshot || 'none'}}</ff-button>
                </div>
            </template>
            <ItemTable :items="devices" :columns="columns" @deviceAction="deviceAction"/>
        </template>
        <template v-else-if="addDeviceEnabled && !loading">
            <div class="flex justify-center mb-4 p-8">
                <ff-button @click="showCreateDeviceDialog">
                    <template v-slot:icon-right>
                        <PlusSmIcon />
                    </template>
                    Register Device
                </ff-button>
            </div>
        </template>
        <template v-if="devices.length === 0 && !loading">
            <div class="flex text-gray-500 justify-center italic mb-4 p-8">
                <template v-if="isProjectDeviceView">
                    <div class="text-center">
                        <p>You have not added any devices to this team yet.</p>
                        <p>To add a device, go to the <router-link :to="{name: 'TeamDevices', params: {team_slug:this.team.slug}}">Team Device</router-link> page</p>
                    </div>
                </template>
                <template v-else>
                    You don't have any devices yet
                </template>
            </div>
        </template>
    </form>
    <TeamDeviceCreateDialog :team="team" @deviceCreated="deviceCreated" @deviceUpdated="deviceUpdated" ref="teamDeviceCreateDialog"/>
    <ConfirmDeviceDeleteDialog @deleteDevice="deleteDevice" ref="confirmDeviceDeleteDialog" />
    <DeviceCredentialsDialog ref="deviceCredentialsDialog" />
    <ConfirmDeviceUnassignDialog @unassignDevice="unassignDevice" ref="confirmDeviceUnassignDialog" />
    <DeviceAssignProjectDialog :team="team" @assignDevice="assignDevice" ref="deviceAssignProjectDialog" />
</template>

<script>
import { mapState } from 'vuex'
import { useRoute, useRouter } from 'vue-router'
import { markRaw } from 'vue'

import { Roles } from '@core/lib/roles'

import teamApi from '@/api/team'
import deviceApi from '@/api/devices'
import projectApi from '@/api/project'

import DeviceEditButton from './components/DeviceEditButton.vue'
import ItemTable from '@/components/tables/ItemTable'
import SectionTopMenu from '@/components/SectionTopMenu'
import ProjectStatusBadge from '@/pages/project/components/ProjectStatusBadge'

import { CheckCircleIcon, ChipIcon, PlusSmIcon, ClockIcon, ExclamationIcon } from '@heroicons/vue/outline'

import TeamDeviceCreateDialog from './dialogs/TeamDeviceCreateDialog'
import ConfirmDeviceDeleteDialog from './dialogs/ConfirmDeviceDeleteDialog'
import ConfirmDeviceUnassignDialog from './dialogs/ConfirmDeviceUnassignDialog'
import DeviceCredentialsDialog from './dialogs/DeviceCredentialsDialog'
import DeviceAssignProjectDialog from './dialogs/DeviceAssignProjectDialog'

const DeviceLink = {
    template: `<div class="flex">
        <ChipIcon class="w-6 mr-2 text-gray-500" />
        <div class="flex flex-col space-y-1">
            <span class="text-lg">{{name}}</span>
            <span class="text-xs text-gray-500">id: {{id}}</span>
        </div>
    </div>`,
    props: ['id', 'name', 'type'],
    components: { ChipIcon }
}
const ProjectLink = {
    template: `<template v-if="project">
        <router-link :to="{ name: 'ProjectDevices', params: { id: project.id }}">{{project.name}}</router-link>
        </template>
        <template v-else><span class="italic text-gray-500">unassigned</span></template>`,
    props: ['project']
}
const LastSeen = {
    template: '<span><span v-if="lastSeenSince">{{lastSeenSince}}</span><span v-else class="italic text-gray-500">never</span></span>',
    props: ['lastSeenSince']
}

export default {
    name: 'TeamDevices',
    data () {
        return {
            loading: false,
            devices: [],
            checkInterval: null
        }
    },
    watch: {
        team: 'fetchData',
        project: 'fetchData'
    },
    mounted () {
        if (!this.features.devices) {
            useRouter().push({ path: `/team/${useRoute().params.team_slug}` })
        } else {
            // Set loading flag to true for initial page load
            this.loading = true
            this.fetchData()
            this.checkInterval = setInterval(() => {
                // Do not set loading flag so the refresh happens in the background
                this.fetchData()
            }, 10000)
        }
    },
    unmounted () {
        clearInterval(this.checkInterval)
    },
    methods: {
        fetchData: async function (newVal) {
            if (this.team.id && !this.project) {
                const data = await teamApi.getTeamDevices(this.team.id)
                this.devices.length = 0
                this.devices = data.devices
            } else if (this.project.id) {
                const data = await projectApi.getProjectDevices(this.project.id)
                this.devices.length = 0
                this.devices = data.devices
            }
            this.loading = false
        },
        showCreateDeviceDialog () {
            this.$refs.teamDeviceCreateDialog.show(null, this.project)
        },
        showEditDeviceDialog (device) {
            this.$refs.teamDeviceCreateDialog.show(device)
        },
        async deviceCreated (device) {
            setTimeout(() => {
                this.$refs.deviceCredentialsDialog.show(device)
            }, 500)
            this.devices.push(device)
        },
        deviceUpdated (device) {
            const index = this.devices.findIndex(d => d.id === device.id)
            if (index > -1) {
                this.devices[index] = device
            }
        },
        async deleteDevice (device) {
            await deviceApi.deleteDevice(device.id)
            const index = this.devices.indexOf(device)
            this.devices.splice(index, 1)
        },
        async assignDevice (device, projectId) {
            const updatedDevice = await deviceApi.updateDevice(device.id, { project: projectId })
            device.project = updatedDevice.project
        },
        async unassignDevice (device) {
            await deviceApi.updateDevice(device.id, { project: null })
            delete device.project
            // If this component is being used on the Team/Device page - this unassign should
            // remove it from the view.
            if (this.isProjectDeviceView) {
                const index = this.devices.indexOf(device)
                this.devices.splice(index, 1)
            }
        },
        deviceAction (action, deviceId) {
            const device = this.devices.find(d => d.id === deviceId)
            if (action === 'edit') {
                this.showEditDeviceDialog(device)
            } else if (action === 'delete') {
                this.$refs.confirmDeviceDeleteDialog.show(device)
            } else if (action === 'updateCredentials') {
                this.$refs.deviceCredentialsDialog.show(device)
            } else if (action === 'removeFromProject') {
                this.$refs.confirmDeviceUnassignDialog.show(device)
            } else if (action === 'assignToProject') {
                this.$refs.deviceAssignProjectDialog.show(device)
            }
        }
    },
    computed: {
        ...mapState('account', ['features']),
        isProjectDeviceView: function () {
            return this.project && this.project.id
        },
        addDeviceEnabled: function () {
            return !this.isProjectDeviceView && this.teamMembership.role === Roles.Owner
        },
        columns: function () {
            const targetSnapshot = this.project?.deviceSettings.targetSnapshot

            // Because of the limitations of the `ItemTable` component, we need
            // this SnapshotComponent to know what the Project TargetSnapshot is.
            // That information is not attached to the devices. So by defining
            // the component inline here, we have `targetSnapshot` in scope.
            // This is not good Vue. All of these inline components should be
            // pulled out - but without a means to attach additional props to
            // individual cells, we don't have that option right now.
            const SnapshotComponent = {
                template: `<span class="flex space-x-4">
    
    <span v-if="id || updateNeeded" class="flex items-center space-x-2 text-gray-500 italic">
        <ExclamationIcon class="text-yellow-600 w-4" v-if="updateNeeded" />
        <CheckCircleIcon class="text-green-700 w-4" v-else-if="id" />
    </span>
    <template v-if="id"><div class="flex flex-col"><span>{{name}}</span><span class="text-xs text-gray-500">{{id}}</span></div></template>
    <template v-else><span class="italic text-gray-500">none</span></template>
</span>`,
                props: ['id', 'name'],
                computed: {
                    updateNeeded: function () {
                        return this.id !== targetSnapshot
                    }
                },
                components: {
                    ExclamationIcon,
                    CheckCircleIcon
                }
            }

            const cols = [
                { name: 'Device', class: ['w-64'], component: { is: markRaw(DeviceLink) } },
                { name: 'Status', class: ['w-20'], component: { is: markRaw(ProjectStatusBadge) } },
                { name: 'Last Seen', class: ['w-64'], component: { is: markRaw(LastSeen) } }
            ]
            if (!this.isProjectDeviceView) {
                cols.push({
                    name: 'Project', class: ['w-64'], component: { is: markRaw(ProjectLink) }
                })
            } else {
                cols.push(
                    { name: 'Deployed Snapshot', class: ['w-64'], property: 'activeSnapshot', component: { is: markRaw(SnapshotComponent) } }
                    // { name: 'Target', class: ['w-64'], property: 'targetSnapshot', component: { is: markRaw(SnapshotComponent) } }
                )
            }
            cols.push(
                { name: '', class: ['w-16'], component: { is: markRaw(DeviceEditButton) } }
            )
            return cols
        }
    },
    props: ['team', 'teamMembership', 'project'],
    components: {
        ItemTable,
        PlusSmIcon,
        ClockIcon,
        TeamDeviceCreateDialog,
        ConfirmDeviceDeleteDialog,
        DeviceCredentialsDialog,
        ConfirmDeviceUnassignDialog,
        DeviceAssignProjectDialog,
        SectionTopMenu
    }
}
</script>
