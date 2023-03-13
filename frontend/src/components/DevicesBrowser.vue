<template>
    <div
        class="space-y-6"
        data-el="devices-section"
    >
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
            <ff-data-table
                :data-el="`${displayingTeam ? 'devices' : 'remote-instances'}`"
                :columns="columns"
                :rows="Array.from(devices.values())"
                :show-search="true"
                :search-placeholder="`Search ${displayingTeam ? 'Devices' : 'Remote Instances'}...`"
                :show-load-more="!!nextCursor"
                @load-more="loadMore"
            >
                <template #actions>
                    <ff-button
                        v-if="displayingInstance && hasPermission('project:snapshot:create')"
                        data-action="change-target-snapshot"
                        kind="secondary"
                        @click="showSelectTargetSnapshotDialog"
                    >
                        <template #icon-left>
                            <ClockIcon />
                        </template>
                        <span class="font-normal">
                            Target Snapshot: <b>{{ instance.targetSnapshot?.name || 'none' }}</b>
                        </span>
                    </ff-button>
                    <ff-button
                        v-if="hasPermission('device:create')"
                        class="font-normal"
                        data-action="register-device"
                        kind="primary"
                        @click="showCreateDeviceDialog"
                    >
                        <template #icon-left>
                            <PlusSmIcon />
                        </template>
                        Add Device
                    </ff-button>
                </template>
                <template v-if="devices.size === 0" #table>
                    <div class="ff-no-data ff-no-data-large">
                        <span v-if="displayingTeam" data-el="team-no-devices">
                            You don't have any devices yet
                        </span>

                        <span v-else-if="displayingApplication" data-el="application-no-devices">
                            You have not added any devices to this application yet.
                        </span>

                        <span v-else-if="displayingInstance" data-el="instance-no-devices">
                            You have not assigned any devices to this instance yet.
                        </span>

                        <span v-else data-el="no-devices">
                            No devices found.
                        </span>
                    </div>
                </template>
                <template
                    v-if="hasPermission('device:edit')"
                    #context-menu="{row}"
                >
                    <ff-list-item
                        label="Edit Details"
                        @click="deviceAction('edit', row.id)"
                    />
                    <ff-list-item
                        v-if="!row.instance && displayingTeam"
                        label="Add to Application Instance" @click="deviceAction('assignToProject', row.id)"
                    />
                    <ff-list-item
                        v-else
                        label="Remove from Application Instance"
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
    </div>

    <TeamDeviceCreateDialog
        ref="teamDeviceCreateDialog"
        :team="team"
        @device-creating="deviceCreating"
        @device-created="deviceCreated"
        @device-updated="deviceUpdated"
    >
        <template #description>
            <p>
                Here, you can add a new device to your
                <template v-if="displayingTeam">team.</template>
                <template v-else-if="displayingApplication">application.</template>
                <template v-else-if="displayingInstance">application instance.</template>
                This will generate a <b>device.yml</b> file that should be
                placed on the target device. 
            </p>
            <p class="my-4">
                If you want to devices to be automatically registered, you can use provisioning tokens
                in your <router-link :to="{'name': 'TeamSettingsDevices', 'params': {team_slug: team.slug}}">Team Settings</router-link>
            </p>
            <p class="my-4">
                Further info on Devices can be found
                <a href="https://flowforge.com/docs/user/devices/" target="_blank">here</a>.
            </p>
        </template>
    </TeamDeviceCreateDialog>

    <DeviceCredentialsDialog ref="deviceCredentialsDialog" />

    <SnapshotAssignDialog
        v-if="displayingInstance"
        ref="snapshotAssignDialog"
        :instance="instance"
        @snapshot-assigned="$emit('instance-updated')"
    />

    <DeviceAssignProjectDialog
        v-if="displayingTeam"
        ref="deviceAssignProjectDialog"
        :team="team"
        @assign-device="assignDevice"
    />
</template>

<script>
import { ClockIcon } from '@heroicons/vue/outline'
import { PlusSmIcon } from '@heroicons/vue/solid'

import { markRaw } from 'vue'

import DeviceLastSeenBadge from '../pages/device/components/DeviceLastSeenBadge'
import SnapshotAssignDialog from '../pages/instance/Snapshots/dialogs/SnapshotAssignDialog'

import ProjectStatusBadge from '../pages/project/components/ProjectStatusBadge'
import ApplicationLink from '../pages/project/components/cells/ApplicationLink'
import DeviceLink from '../pages/project/components/cells/DeviceLink.vue'
import InstanceInstancesLink from '../pages/project/components/cells/InstanceInstancesLink.vue'
import Snapshot from '../pages/project/components/cells/Snapshot.vue'
import DeviceAssignProjectDialog from '../pages/team/Devices/dialogs/DeviceAssignProjectDialog'
import DeviceCredentialsDialog from '../pages/team/Devices/dialogs/DeviceCredentialsDialog'
import TeamDeviceCreateDialog from '../pages/team/Devices/dialogs/TeamDeviceCreateDialog'

import deviceApi from '@/api/devices'
import instanceApi from '@/api/instances'
import projectApi from '@/api/project'
import teamApi from '@/api/team'

import permissionsMixin from '@/mixins/Permissions'

import Alerts from '@/services/alerts'
import Dialog from '@/services/dialog'

export default {
    name: 'ProjectOverview',
    components: {
        ClockIcon,
        DeviceAssignProjectDialog,
        DeviceCredentialsDialog,
        PlusSmIcon,
        SnapshotAssignDialog,
        TeamDeviceCreateDialog
    },
    mixins: [permissionsMixin],
    inheritAttrs: false,
    props: {
        // One of the three must be provided
        instance: {
            type: Object,
            required: false,
            default: null
        },
        application: {
            type: Object,
            required: false,
            default: null
        },
        team: {
            type: Object,
            required: true
        },
        teamMembership: {
            type: Object,
            required: true
        }
    },
    emits: ['instance-updated'],
    data () {
        return {
            loading: true,
            creatingDevice: false,
            deletingDevice: false,
            nextCursor: null,
            devices: new Map(),
            checkInterval: null
        }
    },
    computed: {
        columns () {
            const columns = [
                { label: 'Device', key: 'name', class: ['w-64'], sortable: true, component: { is: markRaw(DeviceLink) } }
            ]

            const statusColumns = [
                { label: 'Last Seen', key: 'lastSeenAt', class: ['w-32'], sortable: true, component: { is: markRaw(DeviceLastSeenBadge) } },
                { label: 'Last Known Status', class: ['w-32'], component: { is: markRaw(ProjectStatusBadge) } }
            ]

            if (this.displayingTeam) {
                columns.push(
                    ...statusColumns,
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
                    })
            }

            if (!this.displayingInstance) {
                columns.push({
                    label: 'Instance',
                    key: 'instance',
                    class: ['w-64'],
                    sortable: true,
                    component: {
                        is: markRaw(InstanceInstancesLink),
                        map: {
                            id: 'instance.id',
                            name: 'instance.name'
                        }
                    }
                })
            }

            if (!this.displayingTeam) {
                columns.push(
                    ...statusColumns,
                    { label: 'Deployed Snapshot', class: ['w-48'], component: { is: markRaw(Snapshot) } }
                )
            }

            return columns
        },
        hasLoadedModel () {
            return !!this.instance?.id || !!this.application?.id || !!this.team?.id
        },
        displayingInstance () {
            return !!this.instance?.id
        },
        displayingApplication () {
            return !!this.application?.id && !this.displayingInstance
        },
        displayingTeam () {
            return !!this.team?.id && !this.displayingInstance && !this.displayingApplication
        }
    },
    watch: {
        instance: 'refreshData',
        application: 'refreshData',
        team: 'refreshData'
    },
    mounted () {
        this.pollForData()
    },
    unmounted () {
        clearInterval(this.checkInterval)
    },
    methods: {
        showCreateDeviceDialog () {
            this.$refs.teamDeviceCreateDialog.show(null, this.instance, this.application)
        },

        showEditDeviceDialog (device) {
            this.$refs.teamDeviceCreateDialog.show(device)
        },

        showSelectTargetSnapshotDialog () {
            this.$refs.snapshotAssignDialog.show()
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
                this.devices.set(device.id, device)
            }
        },

        deviceUpdated (device) {
            this.devices.set(device.id, device)
        },

        async assignDevice (device, projectId) {
            const updatedDevice = await deviceApi.updateDevice(device.id, { project: projectId })

            // TODO Remove temporary duplication
            device.project = updatedDevice.project
            device.instance = updatedDevice.project
        },

        async pollForData () {
            try {
                if (this.hasLoadedModel) {
                    await this.fetchData(null, true) // to-do: For now, this only polls the first page...
                }
            } finally {
                this.checkInterval = setTimeout(this.pollForData, 10000)
            }
        },

        async refreshData () {
            this.nextCursor = null
            this.loadMore()
        },

        async loadMore () {
            await this.fetchData(this.nextCursor)
        },

        async fetchData (nextCursor = null, polled = false) {
            let data
            if (this.displayingInstance) {
                data = await instanceApi.getInstanceDevices(this.instance.id, nextCursor)
            } else if (this.displayingApplication) {
                data = await projectApi.getProjectDevices(this.application.id, nextCursor)
            } else if (this.displayingTeam) {
                data = await teamApi.getTeamDevices(this.team.id, nextCursor)
            } else {
                return console.warn('Trying to fetch data without a loaded model.')
            }

            // Polling never resets the devices list
            if (!nextCursor && !polled) {
                this.devices = new Map()
            }
            data.devices.forEach(device => {
                this.devices.set(device.id, device)
            })

            // TODO: Polling only loads the first page
            if (!polled) {
                this.nextCursor = data.meta.next_cursor
            }

            this.loading = false
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
                    header: 'Remove Device from Instance',
                    kind: 'danger',
                    text: 'Are you sure you want to remove this device from the instance? This will stop the flows running on the device.',
                    confirmLabel: 'Remove'
                }, async () => {
                    await deviceApi.updateDevice(device.id, { project: null })
                    delete device.project

                    this.devices.delete(device.id)

                    Alerts.emit('Successfully removed the device from the instance.', 'confirmation')
                })
            } else if (action === 'assignToProject') {
                this.$refs.deviceAssignProjectDialog.show(device)
            }
        }
    }
}
</script>
