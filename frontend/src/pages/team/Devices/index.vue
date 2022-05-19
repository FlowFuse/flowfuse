<template>
    <SectionTopMenu v-if="!isProjectDeviceView" hero="Devices">
        <template v-slot:tools>
            <ff-button v-if="addDeviceEnabled" kind="primary" size="small" @click="showCreateDeviceDialog"><template v-slot:icon-left><PlusSmIcon /></template>Register Device</ff-button>
        </template>
    </SectionTopMenu>
    <form class="space-y-6">
        <template v-if="devices.length > 0">
            <template v-if="isProjectDeviceView">
                <ff-button kind="primary" size="small" @click="showCreateDeviceDialog"><template v-slot:icon-left><PlusSmIcon /></template>Register Device</ff-button>
            </template>
            <ItemTable :items="devices" :columns="columns" @deviceAction="deviceAction"/>
        </template>
        <template v-else-if="addDeviceEnabled">
            <div class="flex justify-center mb-4 p-8">
                <ff-button @click="showCreateDeviceDialog">
                    <template v-slot:icon-right>
                        <PlusSmIcon />
                    </template>
                    Register Device
                </ff-button>
            </div>
        </template>
        <template v-if="devices.length === 0">
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
import ItemTable from '@/components/tables/ItemTable'
import { PlusSmIcon } from '@heroicons/vue/outline'
import TeamDeviceCreateDialog from './dialogs/TeamDeviceCreateDialog'
import ConfirmDeviceDeleteDialog from './dialogs/ConfirmDeviceDeleteDialog'
import ConfirmDeviceUnassignDialog from './dialogs/ConfirmDeviceUnassignDialog'
import DeviceCredentialsDialog from './dialogs/DeviceCredentialsDialog'
import DeviceAssignProjectDialog from './dialogs/DeviceAssignProjectDialog'
import ProjectStatusBadge from '@/pages/project/components/ProjectStatusBadge'
import SectionTopMenu from '@/components/SectionTopMenu'

import DeviceEditButton from './components/DeviceEditButton.vue'

const ProjectLink = {
    template: `<template v-if="project">
    <router-link :to="{ name: 'Project', params: { id: project.id }}">{{project.name}}</router-link>
</template>
<template v-else>
    <span class="italic text-gray-400">unassigned</span>
</template>`,
    props: ['project']
}

export default {
    name: 'TeamDevices',
    data () {
        return {
            devices: []
        }
    },
    watch: {
        team: 'fetchData',
        project: 'fetchData'
    },
    mounted () {
        this.checkAccess()
    },
    methods: {
        checkAccess: async function () {
            if (!this.features.devices) {
                useRouter().push({ path: `/team/${useRoute().params.team_slug}` })
            } else {
                this.fetchData()
            }
        },
        fetchData: async function (newVal) {
            if (this.team.id && !this.project) {
                const data = await teamApi.getTeamDevices(this.team.id)
                this.devices = data.devices
            } else if (this.project.id) {
                const data = await projectApi.getProjectDevices(this.project.id)
                this.devices = data.devices
            }
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
            const cols = [
                { name: 'ID', class: ['w-16'], property: 'id' },
                { name: 'Device Name', class: ['w-64'], property: 'name' },
                { name: 'Status', class: ['w-64'], component: { is: markRaw(ProjectStatusBadge) } },
                { name: 'Type', class: ['w-64'], property: 'type' },
                { name: '', class: ['w-16'], component: { is: markRaw(DeviceEditButton) } }
            ]
            if (!this.isProjectDeviceView) {
                cols.splice(4, 0, {
                    name: 'Project', class: ['w-64'], component: { is: markRaw(ProjectLink) }
                })
            }
            return cols
        }
    },
    props: ['team', 'teamMembership', 'project'],
    components: {
        ItemTable,
        PlusSmIcon,
        TeamDeviceCreateDialog,
        ConfirmDeviceDeleteDialog,
        DeviceCredentialsDialog,
        ConfirmDeviceUnassignDialog,
        DeviceAssignProjectDialog,
        SectionTopMenu
    }
}
</script>
