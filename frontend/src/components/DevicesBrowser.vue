<template>
    <div
        class="space-y-2"
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
            <DevicesStatusBar data-el="devicestatus-lastseen" label="Last Seen" :devices="Array.from(devices.values())" property="lastseen" :filter="filter" @filter-selected="applyFilter" />
            <DevicesStatusBar data-el="devicestatus-status" label="Last Known Status" :devices="Array.from(devices.values())" property="status" :filter="filter" @filter-selected="applyFilter" />
            <ff-data-table
                v-if="devices.size > 0"
                data-el="devices-browser"
                :columns="columns"
                :rows="filteredDevices"
                :show-search="true"
                search-placeholder="Search Devices"
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
                        label="Add to Instance"
                        data-action="device-assign"
                        @click="deviceAction('assignToProject', row.id)"
                    />
                    <ff-list-item
                        v-else
                        label="Remove from Application Instance"
                        data-action="device-remove"
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
            <template v-else>
                <template v-if="displayingTeam">
                    <EmptyState data-el="team-no-devices">
                        <template #header>Add your First Device</template>
                        <template #message>
                            <p>
                                Devices in FlowForge allow you to manage Node-RED instances
                                running on remote hardware.
                            </p>
                            <p>
                                A Device runs the <a
                                    class="ff-link" href="https://flowforge.com/docs/user/devices"
                                    target="_blank"
                                >FlowForge Device Agent</a>, and can be used to deploy and debug
                                instances anywhere, from here, in FlowForge.
                            </p>
                        </template>
                        <template #actions>
                            <ff-button
                                v-if="hasPermission('device:create')"
                                class="font-normal"
                                kind="primary"
                                data-action="register-device"
                                @click="showCreateDeviceDialog"
                            >
                                <template #icon-left>
                                    <PlusSmIcon />
                                </template>
                                Add Device
                            </ff-button>
                        </template>
                    </EmptyState>
                </template>
                <template v-else-if="displayingInstance">
                    <EmptyState data-el="instance-no-devices">
                        <template #header>Connect your First Device</template>
                        <template #message>
                            <p>
                                Here, you will see a list of Devices connected to this Node-RED Instance.
                            </p>
                            <p>
                                You can deploy Snapshots of this Instance to your connected Devices.
                            </p>
                            <p>
                                A full list of your Team's Devices are available <router-link
                                    class="ff-link"
                                    :to="{name: 'TeamDevices', params: {team_slug: team.slug}}"
                                >
                                    here
                                </router-link>.
                            </p>
                        </template>
                    </EmptyState>
                </template>
                <div v-else class="ff-no-data ff-no-data-large">
                    <span data-el="no-devices">
                        No devices found.
                    </span>
                </div>
            </template>
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

    <DeviceAssignInstanceDialog
        v-if="displayingTeam"
        ref="deviceAssignInstanceDialog"
        @assign-device="assignDevice"
    />
</template>

<script>
import { ClockIcon } from '@heroicons/vue/outline'
import { PlusSmIcon } from '@heroicons/vue/solid'

import { markRaw } from 'vue'

import deviceApi from '../api/devices.js'
import instanceApi from '../api/instances.js'
import teamApi from '../api/team.js'

import permissionsMixin from '../mixins/Permissions.js'

import ApplicationLink from '../pages/application/components/cells/ApplicationLink.vue'
import DeviceLink from '../pages/application/components/cells/DeviceLink.vue'
import InstanceInstancesLink from '../pages/application/components/cells/InstanceInstancesLink.vue'
import Snapshot from '../pages/application/components/cells/Snapshot.vue'

import DeviceLastSeenBadge from '../pages/device/components/DeviceLastSeenBadge.vue'
import SnapshotAssignDialog from '../pages/instance/Snapshots/dialogs/SnapshotAssignDialog.vue'
import InstanceStatusBadge from '../pages/instance/components/InstanceStatusBadge.vue'
import DeviceAssignInstanceDialog from '../pages/team/Devices/dialogs/DeviceAssignInstanceDialog.vue'
import DeviceCredentialsDialog from '../pages/team/Devices/dialogs/DeviceCredentialsDialog.vue'
import TeamDeviceCreateDialog from '../pages/team/Devices/dialogs/TeamDeviceCreateDialog.vue'

import Alerts from '../services/alerts.js'
import Dialog from '../services/dialog.js'

import EmptyState from './EmptyState.vue'
import DevicesStatusBar from './charts/DeviceStatusBar.vue'

export default {
    name: 'ProjectOverview',
    components: {
        ClockIcon,
        DeviceAssignInstanceDialog,
        DeviceCredentialsDialog,
        PlusSmIcon,
        SnapshotAssignDialog,
        TeamDeviceCreateDialog,
        EmptyState,
        DevicesStatusBar
    },
    mixins: [permissionsMixin],
    inheritAttrs: false,
    props: {
        // One of the two must be provided
        instance: {
            type: Object,
            required: false,
            default: null
        },
        team: {
            type: Object,
            required: true
        },

        // Used for hasPermission
        teamMembership: {
            type: Object,
            required: true
        }
    },
    emits: ['instance-updated'],
    data () {
        return {
            loading: true,
            filter: null,
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
                { label: 'Device', key: 'name', class: ['w-64'], sortable: true, component: { is: markRaw(DeviceLink) } },
                { label: 'Type', key: 'type', class: ['w-48'], sortable: true }
            ]

            const statusColumns = [
                { label: 'Last Seen', key: 'lastSeenAt', class: ['w-32'], sortable: true, component: { is: markRaw(DeviceLastSeenBadge) } },
                { label: 'Last Known Status', class: ['w-32'], component: { is: markRaw(InstanceStatusBadge) } }
            ]

            if (this.displayingTeam) {
                columns.push(
                    ...statusColumns,
                    {
                        label: 'Application',
                        class: ['w-48'],
                        key: 'application',
                        sortable: true,
                        component: {
                            is: markRaw(ApplicationLink),
                            map: {
                                id: 'application.id',
                                name: 'application.name'
                            }
                        }
                    }
                )
            }

            if (!this.displayingInstance) {
                columns.push({
                    label: 'Instance',
                    key: 'instance',
                    class: ['w-48'],
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
        filteredDevices () {
            let filteredDevices = []
            if (!this.filter) {
                filteredDevices = Array.from(this.devices.values())
            } else {
                filteredDevices = Array.from(this.devices.values()).filter((d) => {
                    return this.filter.devices.includes(d.id)
                })
            }
            return filteredDevices
        },
        displayingInstance () {
            return this.instance !== null
        },
        displayingTeam () {
            return this.team !== null && !this.displayingInstance
        },
        hasLoadedModel () {
            return (
                (this.displayingInstance && !!this.instance?.id) ||
                (this.displayingTeam && !!this.team?.id)
            )
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
        applyFilter (filter) {
            this.filter = filter
        },
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
                this.applyFilter()
            }
        },

        deviceUpdated (device) {
            this.devices.set(device.id, device)
        },

        async assignDevice (device, instanceId) {
            const updatedDevice = await deviceApi.updateDevice(device.id, { project: instanceId })

            if (updatedDevice.project) {
                device.instance = updatedDevice.project
            }

            if (updatedDevice.application) {
                device.application = updatedDevice.application
            }

            this.devices.set(device.id, device)
        },

        async pollForData () {
            try {
                if (this.hasLoadedModel) {
                    const firstRequest = !this.checkInterval
                    await this.fetchData(null, !firstRequest) // to-do: For now, this only polls the first page...
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
            if (this.hasLoadedModel) {
                await this.fetchData(this.nextCursor)
            }
        },

        async fetchData (nextCursor = null, polled = false) {
            let data
            if (this.displayingInstance) {
                data = await instanceApi.getInstanceDevices(this.instance.id, nextCursor)
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

            this.applyFilter(this.filter)

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

                    delete device.instance
                    delete device.application

                    if (this.displayingInstance) {
                        this.devices.delete(device.id)
                    }

                    Alerts.emit('Successfully removed the device from the instance.', 'confirmation')
                })
            } else if (action === 'assignToProject') {
                this.$refs.deviceAssignInstanceDialog.show(device)
            }
        }
    }
}
</script>
