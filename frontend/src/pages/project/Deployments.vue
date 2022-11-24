<template>
    <div>
        <div class="border-b border-gray-200 mb-3 space-y-6">
            <div class="w-full md:w-auto mb-2 mr-8">
                <div class="text-gray-800 text-lg font-bold">
                    Cloud
                </div>
            </div>
        </div>

        <div class="space-y-6 mb-6">
            <ff-data-table
                data-el="cloud-deployments"
                :columns="cloudColumns"
                :rows="cloudRows"
            >
                <template
                    v-if="hasPermission('device:edit')"
                    #context-menu
                >
                    <ff-list-item
                        :disabled="project.pendingStateChange || projectRunning"
                        label="Start"
                        @click="$emit('project-start')"
                    />

                    <ff-list-item
                        :disabled="!projectNotSuspended"
                        label="Restart"
                        @click="$emit('project-restart')"
                    />

                    <ff-list-item
                        :disabled="!projectNotSuspended"
                        kind="danger"
                        label="Suspend"
                        @click="$emit('project-suspend')"
                    />

                    <ff-list-item
                        v-if="hasPermission('project:delete')"
                        kind="danger"
                        label="Delete"
                        @click="$emit('project-delete')"
                    />
                </template>
            </ff-data-table>
        </div>

        <div class="border-b border-gray-200 mb-3">
            <div class="w-full md:w-auto mb-2 mr-8">
                <div class="text-gray-800 text-lg font-bold">
                    Devices
                </div>
            </div>
        </div>
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
                <template v-if="devices.length > 0">
                    <ff-data-table
                        data-el="devices"
                        :columns="columns"
                        :rows="devices"
                        :show-search="true"
                        search-placeholder="Search Device Deployments..."
                    >
                        <template
                            v-if="hasPermission('project:snapshot:create')"
                            #actions
                        >
                            <ff-button
                                data-action="change-target-snapshot"
                                kind="secondary"
                                @click="showSelectTargetSnapshotDialog"
                            >
                                <template #icon-left>
                                    <ClockIcon />
                                </template>
                                <span class="font-normal">
                                    Target Snapshot: <b>{{ project.targetSnapshot?.name || 'none' }}</b>
                                </span>
                            </ff-button>
                            <ff-button
                                v-if="hasPermission('device:create')"
                                class="font-normal"
                                data-action="register-device"
                                kind="primary"
                                @click="showCreateDeviceDialog"
                            >
                                <template #icon-right>
                                    <PlusSmIcon />
                                </template>
                                <span class="font-normal">Add Device</span>
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
                            <p>You have not added any devices to this project yet.</p>
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
        </div>

        <TeamDeviceCreateDialog
            ref="teamDeviceCreateDialog"
            :team="team"
            @deviceCreating="deviceCreating"
            @deviceCreated="deviceCreated"
            @deviceUpdated="deviceUpdated"
        />
        <DeviceCredentialsDialog ref="deviceCredentialsDialog" />
        <SnapshotAssignDialog
            ref="snapshotAssignDialog"
            :project="project"
            @snapshot-assigned="$emit('projectUpdated')"
        />
    </div>
</template>

<script>

import { Roles } from '@core/lib/roles'
import { ClockIcon } from '@heroicons/vue/outline'
import { PlusSmIcon } from '@heroicons/vue/solid'

import { markRaw } from 'vue'
import { mapState } from 'vuex'

import DeviceCredentialsDialog from '../team/Devices/dialogs/DeviceCredentialsDialog'
import TeamDeviceCreateDialog from '../team/Devices/dialogs/TeamDeviceCreateDialog'

import SnapshotAssignDialog from './Snapshots/dialogs/SnapshotAssignDialog'

import DeploymentLink from './components/cells/DeploymentLink.vue'
import DeviceLink from './components/cells/DeviceLink.vue'
import LastSeen from './components/cells/LastSeen.vue'
import ProjectEditorLink from './components/cells/ProjectEditorLink.vue'
import Snapshot from './components/cells/Snapshot.vue'

import deviceApi from '@/api/devices'
import projectApi from '@/api/project'
import permissionsMixin from '@/mixins/Permissions'
import ProjectStatusBadge from '@/pages/project/components/ProjectStatusBadge'
import Alerts from '@/services/alerts'
import Dialog from '@/services/dialog'

export default {
    name: 'ProjectDeployments',
    components: {
        ClockIcon,
        DeviceCredentialsDialog,
        PlusSmIcon,
        SnapshotAssignDialog,
        TeamDeviceCreateDialog
    },
    mixins: [permissionsMixin],
    props: {
        project: {
            type: Object,
            required: true
        }
    },
    emits: ['project-delete', 'project-suspend', 'project-restart', 'project-start', 'projectUpdated'],
    data () {
        return {
            loading: true,
            creatingDevice: false,
            deletingDevice: false,
            devices: [],
            checkInterval: null
        }
    },
    computed: {
        ...mapState('account', ['team', 'teamMembership']),
        columns () {
            return [
                { label: 'Device', class: ['w-64'], sortable: true, component: { is: markRaw(DeviceLink) } },
                { label: 'Last Seen', class: ['w-48'], sortable: true, component: { is: markRaw(LastSeen) } },
                { label: 'Deployed Snapshot', class: ['w-32'], component: { is: markRaw(Snapshot) } },
                { label: '', class: ['w-20'], component: { is: markRaw(ProjectStatusBadge) } }
            ]
        },
        cloudColumns () {
            return [
                { label: 'Location', class: ['w-64'], component: { is: markRaw(DeploymentLink), extraProps: { disabled: !this.projectRunning || this.isVisitingAdmin } } },
                { label: 'Last Deployed', class: ['w-48'], component: { is: markRaw(LastSeen), map: { lastSeenSince: 'flowLastUpdatedSince' } } },
                { label: 'Deployment Status', class: ['w-32'], component: { is: markRaw(ProjectStatusBadge), map: { status: 'meta.state' } } },
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
                }
            } finally {
                this.checkInterval = setTimeout(this.pollForData, 10000)
            }
        },
        fetchData: async function () {
            const data = await projectApi.getProjectDevices(this.project.id)
            this.devices = data.devices
            this.loading = false
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
        },

        showSelectTargetSnapshotDialog () {
            this.$refs.snapshotAssignDialog.show()
        }
    }
}
</script>
