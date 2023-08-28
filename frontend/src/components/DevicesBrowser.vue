<template>
    <div
        class="space-y-2"
        data-el="devices-section"
    >
        <ff-loading
            v-if="loadingStatuses || loadingDevices"
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
            <DevicesStatusBar v-if="allDeviceStatuses.size > 0" data-el="devicestatus-lastseen" label="Last Seen" :devices="Array.from(allDeviceStatuses.values())" property="lastseen" :filter="filter" @filter-selected="applyFilter" />
            <DevicesStatusBar v-if="allDeviceStatuses.size > 0" data-el="devicestatus-status" label="Last Known Status" :devices="Array.from(allDeviceStatuses.values())" property="status" :filter="filter" @filter-selected="applyFilter" />
            <ff-data-table
                v-if="allDeviceStatuses.size > 0"
                data-el="devices-browser"
                :columns="columns"
                :rows="devicesWithStatuses"
                :show-search="true"
                search-placeholder="Search Devices"
                :show-load-more="!!nextCursor"
                @load-more="loadMore"
                @update:search="updateSearch"
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
                        label="Regenerate Configuration"
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
                        <template #img>
                            <img src="../images/empty-states/team-devices.png">
                        </template>
                        <template #header>Connect your First Device</template>
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
                        <template #img>
                            <img src="../images/empty-states/instance-devices.png">
                        </template>
                        <template #header>Connect your First Device</template>
                        <template #message>
                            <p>
                                Here, you will see a list of Devices connected to this Node-RED Instance.
                            </p>
                            <p>
                                You can deploy <router-link class="ff-link" :to="{name: 'InstanceSnapshots', params: {id: instance.id}}">Snapshots</router-link> of this Instance to your connected Devices.
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
                If you want your device to be automatically registered to an instance, in order to remotely deploy flows, you can use provisioning tokens
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
    name: 'DevicesBrowser',
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
            // Page state
            loadingStatuses: true,
            loadingDevices: true,
            creatingDevice: false,
            deletingDevice: false,

            // Devices lists
            allDeviceStatuses: new Map(), // every device known
            devices: new Map(), // devices currently available to be displayed

            // Server side
            filter: null,
            nextCursor: null,
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
        devicesWithStatuses () {
            return Array.from(this.devices.values()).map(device => {
                const status = this.allDeviceStatuses.get(device.id)
                if (status) {
                    return {
                        ...device,
                        ...status
                    }
                }
                return device
            })
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
        instance: 'fullReloadOfData',
        application: 'fullReloadOfData',
        team: 'fullReloadOfData'
    },
    mounted () {
        this.fullReloadOfData()
    },
    unmounted () {
        clearInterval(this.checkInterval)
    },
    methods: {
        /**
         * filter: Object containing keys:
         *  - devices: an array of device ids
         *  - property: which filter row is being applied, e.g. status or lastseen
         *  - bucket: which value of this property are we filtering on from the buckets in the status bar
         */
        applyFilter (filter) {
            console.log('applyFilter', filter)
            this.filter = filter

            this.loadDevices(true)
        },

        updateSearch (searchTerm) {
            console.log('updateSearch', searchTerm)
            this.searchTerm = searchTerm

            this.loadDevices(true)
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
                this.loadedDevices.set(device.id, device)
                this.allDevices.set(device.id, device)
                this.applyFilter()
            }
        },

        deviceUpdated (device) {
            this.allDevices.set(device.id, device)
            this.loadedDevices.set(device.id, device)
        },

        async assignDevice (device, instanceId) {
            const updatedDevice = await deviceApi.updateDevice(device.id, { instance: instanceId })

            if (updatedDevice.instance) {
                device.instance = updatedDevice.instance
            }

            if (updatedDevice.application) {
                device.application = updatedDevice.application
            }

            this.devices.set(device.id, device)
        },

        // Device loading
        fullReloadOfData () {
            this.loadDevices(true)
            this.pollForDeviceStatuses(true)
        },

        async loadDevices (reset) {
            if (this.hasLoadedModel) {
                await this.fetchDevices(reset)
            }
        },

        async loadMoreDevices () {
            await this.fetchDevices()
        },

        async pollForDeviceStatuses (reset) {
            if (this.checkInterval) {
                clearTimeout(this.checkInterval)
            }

            try {
                if (this.hasLoadedModel) {
                    await this.fetchAllDeviceStatuses(reset)
                }
            } finally {
                this.checkInterval = setTimeout(this.pollForDeviceStatuses, 10000)
            }
        },

        // Actual fetching methods
        async fetchData (nextCursor = null, limit = null, extraParams = { statusOnly: false }) {
            const query = null // handled via extraParams
            if (this.displayingInstance) {
                return await instanceApi.getInstanceDevices(this.instance.id, nextCursor, limit, query, extraParams)
            }

            if (this.displayingTeam) {
                return await teamApi.getTeamDevices(this.team.id, nextCursor, limit, query, extraParams)
            }

            console.warn('Trying to fetch data without a loaded model.')

            return null
        },

        async fetchAllDeviceStatuses (reset = false) {
            const data = await this.fetchData(null, null, { statusOnly: true })

            if (reset) {
                this.allDeviceStatuses = new Map()
            }

            if (data.meta.next_cursor || data.devices.length < data.count) {
                console.warn('Device Status API should not be paginating')
            }

            data.devices.forEach(device => {
                this.allDeviceStatuses.set(device.id, device)
            })

            this.loadingStatuses = false
        },

        async fetchDevices (resetPage = false) {
            if (resetPage) {
                this.nextCursor = null
            }

            /// Params to send to the server
            const nextCursor = this.nextCursor
            const extraParams = {}

            // Specific filtering
            if (this.filter?.property && this.filter?.bucket) {
                extraParams.filter = `${this.filter.property}:${this.filter.bucket}`
            }

            // Search and sort
            if (this.searchTerm) {
                extraParams.query = this.searchTerm
            }
            if (this.sort) {
                extraParams.sort = this.sort
                if (this.dir) {
                    extraParams.dir = this.dir
                }
            }

            const data = await this.fetchData(nextCursor, null, extraParams)

            if (resetPage) {
                this.devices = new Map()
            }

            console.log(data)

            data.devices.forEach(device => {
                this.devices.set(device.id, device)
            })

            this.loadingDevices = false
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
                    await deviceApi.updateDevice(device.id, { instance: null })

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
