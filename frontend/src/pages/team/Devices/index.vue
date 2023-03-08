<template>
    <SectionTopMenu hero="Devices" help-header="FlowForge - Devices" info="A list of all edge devices registered in your team. Assign them to application instances in order to deploy Node-RED remotely.">
        <template v-slot:helptext>
            <p>FlowForge can be used to manage instances of Node-RED running on remote devices.</p>
            <p>Each device must run the <a href="https://flowforge.com/docs/user/devices/" target="_blank">FlowForge Device Agent</a>, which connects back to the platform to receive updates.</p>
            <p>Devices are registered to a Team, and assigned to a Project within that team.</p>
            <p>Flows can then be deployed remotely to the devices through a Project Snapshot.</p>
        </template>
        <template v-slot:tools>
            <ff-button v-if="addDeviceEnabled" data-action="register-device" kind="primary" size="small" @click="showCreateDeviceDialog"><template v-slot:icon-left><PlusSmIcon /></template>Register Device</ff-button>
        </template>
    </SectionTopMenu>
    <div class="space-y-6">
        <ff-loading v-if="loading" message="Loading Devices..." />
        <ff-loading v-else-if="creatingDevice" message="Creating Device..." />
        <ff-loading v-else-if="deletingDevice" message="Deleting Device..." />
        <template v-else>
            <template v-if="this.devices.size === 0">
                <div class="ff-no-data ff-no-data-large">
                    You don't have any devices yet
                </div>
            </template>
            <template v-if="this.devices.size > 0">
                <ff-data-table
                    data-el="devices"
                    :columns="columns"
                    :rows="Array.from(this.devices.values())"
                    :show-search="true"
                    search-placeholder="Search Devices..."
                    :show-load-more="!!nextCursor"
                    @load-more="loadMore"
                >
                    <template v-if="hasPermission('device:edit')" v-slot:context-menu="{row}">
                        <ff-list-item label="Edit Details" @click="deviceAction('edit', row.id)"/>
                        <ff-list-item v-if="!row.project" label="Add to Application Instance" @click="deviceAction('assignToProject', row.id)" />
                        <ff-list-item v-else label="Remove from Application Instance" @click="deviceAction('removeFromProject', row.id)" />
                        <ff-list-item kind="danger" label="Regenerate Credentials" @click="deviceAction('updateCredentials', row.id)"/>
                        <ff-list-item v-if="hasPermission('device:delete')" kind="danger" label="Delete Device" @click="deviceAction('delete', row.id)" />
                    </template>
                </ff-data-table>
            </template>
        </template>
    </div>
    <TeamDeviceCreateDialog :team="team" @deviceCreating="deviceCreating" @deviceCreated="deviceCreated" @deviceUpdated="deviceUpdated" ref="teamDeviceCreateDialog">
        <template v-slot:description>
            <p>Here, you can register a new device to your team. This will provide you with a <b>device.yml</b>
                to be moved to the respective device. Further details on Devices in FlowForge can be found
                <a href="https://flowforge.com/docs/user/devices/" target="_blank">here</a>.</p>
            <p class="mt-4 mb-2">If you want to register devices straight to a particular application instance you can use provisioning tokens
                in your <router-link :to="{'name': 'TeamSettingsDevices', 'params': {team_slug: team.slug}}">Team Settings</router-link></p>
        </template>
    </TeamDeviceCreateDialog>
    <DeviceCredentialsDialog ref="deviceCredentialsDialog" />
    <DeviceAssignProjectDialog :team="team" @assignDevice="assignDevice" ref="deviceAssignProjectDialog" />
</template>

<script>
import { markRaw } from 'vue'

import permissionsMixin from '@/mixins/Permissions'

import Alerts from '@/services/alerts'
import Dialog from '@/services/dialog'

import teamApi from '@/api/team'
import deviceApi from '@/api/devices'

import SectionTopMenu from '@/components/SectionTopMenu'
import ProjectStatusBadge from '@/pages/project/components/ProjectStatusBadge'
import DeviceLastSeenBadge from '@/pages/device/components/DeviceLastSeenBadge'

import { ChipIcon, PlusSmIcon } from '@heroicons/vue/outline'

import TeamDeviceCreateDialog from './dialogs/TeamDeviceCreateDialog'
import DeviceCredentialsDialog from './dialogs/DeviceCredentialsDialog'
import DeviceAssignProjectDialog from './dialogs/DeviceAssignProjectDialog'

import DeviceLink from '../../project/components/cells/DeviceLink'
import InstanceLink from '../../project/components/cells/InstanceLink'
import ApplicationLink from '../../project/components/cells/ApplicationLink'

export default {
    name: 'TeamDevices',
    mixins: [permissionsMixin],
    data () {
        return {
            loading: true,
            creatingDevice: false,
            deletingDevice: false,
            devices: new Map(),
            checkInterval: null,
            nextCursor: null
        }
    },
    watch: {
        team: 'fetchData'
    },
    async mounted () {
        await this.fetchData()
        this.loading = false
        this.checkInterval = setTimeout(this.pollForData, 10000)
    },
    unmounted () {
        clearInterval(this.checkInterval)
    },
    methods: {
        async pollForData () {
            try {
                await this.fetchData(null, true) // to-do: For now, this only polls the first page...
            } finally {
                this.checkInterval = setTimeout(this.pollForData, 10000)
            }
        },
        async fetchData (nextCursor = null, polled = false) {
            const data = await teamApi.getTeamDevices(this.team.id, nextCursor)

            // Polling never resets the devices list
            if (!nextCursor && !polled) {
                this.devices = new Map()
            }
            data.devices.forEach(device => {
                this.devices.set(device.id, device)
            })

            // to-do: Polling only loads the first page
            if (!polled) {
                this.nextCursor = data.meta.next_cursor
            }
        },
        async loadMore () {
            await this.fetchData(this.nextCursor)
        },
        showCreateDeviceDialog () {
            this.$refs.teamDeviceCreateDialog.show(null, this.project)
        },
        showEditDeviceDialog (device) {
            this.$refs.teamDeviceCreateDialog.show(device)
        },
        deviceCreating () {
            this.creatingDevice = true
        },
        async deviceCreated (device) {
            this.creatingDevice = false
            if (device) {
                setTimeout(() => {
                    this.$refs.deviceCredentialsDialog.show(device)
                }, 500)
                this.devices.set(device.id, device)
            }
        },
        deviceUpdated (device) {
            this.devices.set(device.id, device)
        },
        async assignDevice (device, projectId) {
            const updatedDevice = await deviceApi.updateDevice(device.id, { project: projectId })
            device.project = updatedDevice.project
        },
        deviceAction (action, deviceId) {
            const device = this.devices.get(deviceId)
            if (action === 'edit') {
                this.showEditDeviceDialog(device)
            } else if (action === 'delete') {
                Dialog.show({
                    header: 'Delete Device',
                    kind: 'danger',
                    text: 'Are you sure you want to delete this device? Once deleted, there is no going back.',
                    confirmLabel: 'Delete'
                }, async () => {
                    this.deletingDevice = true
                    try {
                        await deviceApi.deleteDevice(device.id)
                        Alerts.emit('Successfully deleted the device', 'confirmation')
                        this.devices.delete(device.id)
                    } catch (err) {
                        Alerts.emit('Failed to delete device: ' + err.toString(), 'warning', 7500)
                    } finally {
                        this.deletingDevice = false
                    }
                })
            } else if (action === 'updateCredentials') {
                this.$refs.deviceCredentialsDialog.show(device)
            } else if (action === 'removeFromProject') {
                Dialog.show({
                    header: 'Remove Device from Project',
                    kind: 'danger',
                    text: 'Are you sure you want to remove this device from the instance? This will stop the instance running on the device.',
                    confirmLabel: 'Remove'
                }, async () => {
                    await deviceApi.updateDevice(device.id, { project: null })
                    delete device.project
                    Alerts.emit('Successfully unassigned the instance from this device.', 'confirmation')
                })
            } else if (action === 'assignToProject') {
                this.$refs.deviceAssignProjectDialog.show(device)
            }
        }
    },
    computed: {
        addDeviceEnabled: function () {
            return this.hasPermission('device:create')
        },
        columns: function () {
            return [
                { label: 'Device', class: ['w-64'], key: 'name', sortable: true, component: { is: markRaw(DeviceLink) } },
                { label: 'Last Seen', class: ['w-32'], key: 'lastSeenAt', sortable: true, component: { is: markRaw(DeviceLastSeenBadge) } },
                { label: 'Last Known Status', class: ['w-32'], key: 'status', sortable: true, component: { is: markRaw(ProjectStatusBadge) } },
                {
                    label: 'Application',
                    class: ['w-64'],
                    key: 'project',
                    sortable: true,
                    component: {
                        is: markRaw(ApplicationLink),
                        map: {
                            id: 'project.id',
                            name: 'project.name'
                        }
                    }
                },
                {
                    label: 'Instance',
                    class: ['w-64'],
                    key: 'project',
                    sortable: true,
                    component: {
                        is: markRaw(InstanceLink),
                        map: {
                            id: 'project.id',
                            name: 'project.name'
                        }
                    }
                }
            ]
        }
    },
    props: {
        team: {
            required: true
        },
        teamMembership: {
            required: true
        }
    },
    components: {
        TeamDeviceCreateDialog,
        DeviceCredentialsDialog,
        DeviceAssignProjectDialog,
        SectionTopMenu,
        PlusSmIcon
    }
}
</script>
