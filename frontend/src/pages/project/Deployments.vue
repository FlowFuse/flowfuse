<template>
    <div class="space-y-6">
        <ff-loading
            v-if="loading"
            message="Loading Devices..."
        />
        <ff-loading
            v-else-if="creatingDevice"
            message="Creating Device..."
        />
        <ff-loading
            v-else-if="deletingDevice"
            message="Deleting Device..."
        />
        <template v-else>
            <template v-if="devices.length > 0">
                <div
                    v-if="project?.id"
                    class="flex space-x-8"
                >
                    <ff-button
                        v-if="hasPermission('device:create')"
                        data-action="register-device"
                        kind="primary"
                        size="small"
                        @click="showCreateDeviceDialog"
                    >
                        <template #icon-left>
                            <PlusSmIcon />
                        </template>Register Device
                    </ff-button>
                    <ff-button
                        kind="tertiary"
                        size="small"
                        to="./snapshots"
                    >
                        <template #icon-left>
                            <ClockIcon />
                        </template>
                        Target Snapshot: {{ project.deviceSettings.targetSnapshot || 'none' }}
                    </ff-button>
                </div>

                <ff-data-table
                    data-el="devices"
                    :columns="columns"
                    :rows="devices"
                    :show-search="true"
                    search-placeholder="Search Devices..."
                >
                    <template
                        v-if="hasPermission('device:edit')"
                        #context-menu="{row}"
                    >
                        <ff-list-item
                            label="Edit Details"
                            @click="deviceAction('edit', row.id)"
                        />
                        <ff-list-item
                            label="Remove from Project"
                            @click="deviceAction('removeFromProject', row.id)"
                        />
                        <ff-list-item
                            kind="danger"
                            label="Regenerate Credentials"
                            @click="deviceAction('updateCredentials', row.id)"
                        />
                        <ff-list-item
                            v-if="hasPermission('device:delete')"
                            kind="danger"
                            label="Delete Device"
                            @click="deviceAction('delete', row.id)"
                        />
                    </template>
                </ff-data-table>
            </template>
            <template v-else>
                <div class="flex text-gray-500 justify-center italic mb-4 p-8">
                    <div class="text-center">
                        <p>You have not added any devices to this team yet.</p>
                        <p>
                            To add a device, go to the
                            <router-link :to="{name: 'TeamDevices', params: {team_slug:team.slug}}">
                                Team Device
                            </router-link>
                            page
                        </p>
                    </div>
                </div>
            </template>
        </template>

        <TeamDeviceCreateDialog
            ref="teamDeviceCreateDialog"
            :team="team"
            @deviceCreating="deviceCreating"
            @deviceCreated="deviceCreated"
            @deviceUpdated="deviceUpdated"
        />
        <DeviceCredentialsDialog ref="deviceCredentialsDialog" />
    </div>
</template>

<script>

import { ChipIcon, CheckCircleIcon, ExclamationIcon, PlusSmIcon, ClockIcon } from '@heroicons/vue/solid'

import { markRaw } from 'vue'
import { mapState } from 'vuex'

import DeviceCredentialsDialog from '../team/Devices/dialogs/DeviceCredentialsDialog'
import TeamDeviceCreateDialog from '../team/Devices/dialogs/TeamDeviceCreateDialog'

import deviceApi from '@/api/devices'
import projectApi from '@/api/project'
import permissionsMixin from '@/mixins/Permissions'
import ProjectStatusBadge from '@/pages/project/components/ProjectStatusBadge'
import Alerts from '@/services/alerts'
import Dialog from '@/services/dialog'

const DeviceLink = {
    template: `
        <router-link :to="{ name: 'Device', params: { id: id } }" class="flex">
            <ChipIcon class="w-6 mr-2 text-gray-500" />
            <div class="flex flex-col space-y-1">
                <span class="text-lg">{{name}}</span>
                <span class="text-xs text-gray-500">id: {{id}}</span>
            </div>
        </router-link>`,
    props: ['id', 'name', 'type'],
    components: { ChipIcon }
}
const LastSeen = {
    template: '<span><span v-if="lastSeenSince">{{lastSeenSince}}</span><span v-else class="italic text-gray-500">never</span></span>',
    props: ['lastSeenSince']
}

export default {
    name: 'ProjectDeployments',
    components: {
        ClockIcon,
        PlusSmIcon,
        TeamDeviceCreateDialog,
        DeviceCredentialsDialog
    },
    mixins: [permissionsMixin],
    props: {
        project: {
            type: Object,
            required: true
        }
    },
    data () {
        return {
            loading: false,
            creatingDevice: false,
            deletingDevice: false,
            devices: [],
            checkInterval: null
        }
    },
    computed: {
        ...mapState('account', ['team', 'teamMembership']),
        columns () {
            const targetSnapshot = this.project.deviceSettings.targetSnapshot

            // Because of the limitations of the `ItemTable` component, we need
            // this SnapshotComponent to know what the Project TargetSnapshot is.
            // That information is not attached to the devices. So by defining
            // the component inline here, we have `targetSnapshot` in scope.
            // This is not good Vue. All of these inline components should be
            // pulled out - but without a means to attach additional props to
            // individual cells, we don't have that option right now.
            const SnapshotComponent = {
                template: `<span class="flex space-x-4">
    <span v-if="activeSnapshot?.id || updateNeeded" class="flex items-center space-x-2 text-gray-500 italic">
        <ExclamationIcon class="text-yellow-600 w-4" v-if="updateNeeded" />
        <CheckCircleIcon class="text-green-700 w-4" v-else-if="activeSnapshot?.id" />
    </span>
    <template v-if="activeSnapshot"><div class="flex flex-col"><span>{{ activeSnapshot?.name }}</span><span class="text-xs text-gray-500">{{ activeSnapshot.id }}</span></div></template>
    <template v-else><span class="italic text-gray-500">none</span></template>
</span>`,
                props: ['activeSnapshot', 'targetSnapshot'],
                computed: {
                    updateNeeded: function () {
                        return !this.activeSnapshot || (this.activeSnapshot?.id !== targetSnapshot)
                    }
                },
                components: {
                    ExclamationIcon,
                    CheckCircleIcon
                }
            }

            return [
                { label: 'Device', class: ['w-64'], key: 'name', sortable: true, component: { is: markRaw(DeviceLink) } },
                { label: 'Last Seen', class: ['w-48'], key: 'last seen', sortable: true, component: { is: markRaw(LastSeen) } },
                { label: 'Deployed Snapshot', class: ['w-32'], component: { is: markRaw(SnapshotComponent) } },
                { label: '', class: ['w-20'], key: 'status', sortable: false, component: { is: markRaw(ProjectStatusBadge) } }
            ]
        }
    },
    watch: {
        project: 'fetchData'
    },
    mounted () {
        this.pollForData()
    },
    unmounted () {
        clearInterval(this.checkInterval)
    },
    methods: {
        showCreateDeviceDialog () {
            this.$refs.teamDeviceCreateDialog.show(null, this.project)
        },
        showEditDeviceDialog (device) {
            this.$refs.teamDeviceCreateDialog.show(device)
        },
        deviceCreating () {
            this.creatingDevice = true
        },
        deviceCreated (device) {
            this.creatingDevice = false
            if (device) {
                setTimeout(() => {
                    this.$refs.deviceCredentialsDialog.show(device)
                }, 500)
                this.devices.push(device)
            }
        },
        deviceUpdated (device) {
            const index = this.devices.findIndex(d => d.id === device.id)
            if (index > -1) {
                this.devices[index] = device
            }
        },
        async assignDevice (device, projectId) {
            const updatedDevice = await deviceApi.updateDevice(device.id, { project: projectId })
            device.project = updatedDevice.project
        },
        async pollForData () {
            try {
                if (this.project.id) {
                    await this.fetchData()
                    this.loading = false
                }
            } finally {
                this.checkInterval = setTimeout(this.pollForData, 10000)
            }
        },
        fetchData: async function () {
            const data = await projectApi.getProjectDevices(this.project.id)
            this.devices = data.devices
        },
        deviceAction (action, deviceId) {
            const device = this.devices.find(d => d.id === deviceId)
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
                        const index = this.devices.indexOf(device)
                        this.devices.splice(index, 1)
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
                    text: 'Are you sure you want to remove this device from the project? This will stop the project running on the device.',
                    confirmLabel: 'Remove'
                }, async () => {
                    await deviceApi.updateDevice(device.id, { project: null })
                    delete device.project

                    const index = this.devices.indexOf(device)
                    this.devices.splice(index, 1)

                    Alerts.emit('Successfully unassigned the project from this device.', 'confirmation')
                })
            }
        }
    }
}
</script>
