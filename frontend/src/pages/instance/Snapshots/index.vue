<template>
    <div class="space-y-6">
        <ff-loading v-if="loading" message="Loading Snapshots..." />
        <template v-if="snapshots.length > 0">
            <ff-data-table data-el="snapshots" class="space-y-4" :columns="columns" :rows="snapshots" :show-search="true" search-placeholder="Search Snapshots...">
                <template v-if="hasPermission('project:snapshot:create')" #actions>
                    <ff-button kind="primary" data-action="create-snapshot" @click="showCreateSnapshotDialog"><template #icon-left><PlusSmIcon /></template>Create Snapshot</ff-button>
                </template>
                <template v-if="showContextMenu" #context-menu="{row}">
                    <ff-list-item v-if="hasPermission('project:snapshot:rollback')" label="Rollback" @click="showRollbackDialog(row)" />
                    <ff-list-item v-if="hasPermission('project:snapshot:read')" label="Download package.json" @click="downloadSnapshotPackage(row)" />
                    <ff-list-item v-if="hasPermission('project:snapshot:set-target')" label="Set as Device Target" @click="showDeviceTargetDialog(row)" />
                    <ff-list-item v-if="hasPermission('project:snapshot:delete')" label="Delete Snapshot" kind="danger" @click="showDeleteSnapshotDialog(row)" />
                </template>
            </ff-data-table>
        </template>
        <template v-else-if="!loading">
            <div class="flex flex-col text-gray-500 items-center italic mb-4 p-8 space-y-6">
                <div>You have not created any snapshots yet</div>
                <template v-if="hasPermission('project:snapshot:create')">
                    <ff-button kind="primary" size="small" data-action="create-snapshot" @click="showCreateSnapshotDialog"><template #icon-left><PlusSmIcon /></template>Create Snapshot</ff-button>
                </template>
            </div>
        </template>
        <SnapshotCreateDialog ref="snapshotCreateDialog" data-el="dialog-create-snapshot" :project="instance" @snapshot-created="snapshotCreated" />
    </div>
</template>

<script>
import { PlusSmIcon } from '@heroicons/vue/outline'
import { markRaw } from 'vue'
import { mapState } from 'vuex'

import DaysSince from '../../project/Snapshots/components/cells/DaysSince'
import DeviceCount from '../../project/Snapshots/components/cells/DeviceCount'
import SnapshotName from '../../project/Snapshots/components/cells/SnapshotName'

import SnapshotCreateDialog from './dialogs/SnapshotCreateDialog'

import InstanceApi from '@/api/instances'
import SnapshotApi from '@/api/projectSnapshots'

import UserCell from '@/components/tables/cells/UserCell'
import permissionsMixin from '@/mixins/Permissions'
import Alerts from '@/services/alerts'
import Dialog from '@/services/dialog'

export default {
    name: 'InstanceSnapshots',
    components: {
        SnapshotCreateDialog,
        PlusSmIcon
    },
    mixins: [permissionsMixin],
    props: {
        instance: {
            type: Object,
            required: true
        }
    },
    emits: ['instance-updated'],
    data () {
        return {
            loading: false,
            deviceCounts: {},
            snapshots: []
        }
    },
    computed: {
        ...mapState('account', ['teamMembership']),
        showContextMenu: function () {
            return this.hasPermission('project:snapshot:rollback') || this.hasPermission('project:snapshot:set-target') || this.hasPermission('project:snapshot:delete')
        },
        columns () {
            const cols = [
                {
                    label: 'Snapshot',
                    component: {
                        is: markRaw(SnapshotName),
                        extraProps: {
                            targetSnapshot: this.instance.deviceSettings?.targetSnapshot
                        }
                    }
                },
                {
                    label: '',
                    component: {
                        is: markRaw(DeviceCount),
                        extraProps: {
                            targetSnapshot: this.instance.deviceSettings?.targetSnapshot
                        }
                    }
                },
                {
                    label: 'Created By',
                    class: ['w-56'],
                    component: {
                        is: markRaw(UserCell),
                        map: {
                            avatar: 'user.avatar',
                            name: 'user.name',
                            username: 'user.username'
                        }
                    }
                },
                { label: 'Date Created', class: ['w-56'], component: { is: markRaw(DaysSince), map: { date: 'createdAt' } } }
            ]
            return cols
        }
    },
    watch: {
        team: 'fetchData',
        instance: 'fetchData'
    },
    mounted () {
        this.fetchData()
    },
    methods: {
        fetchData: async function () {
            if (this.instance.id) {
                this.loading = true
                const deviceCounts = await this.countDevices()
                const data = await SnapshotApi.getProjectSnapshots(this.instance.id) // TODO Move to instances?
                this.snapshots = data.snapshots.map((s) => {
                    s.deviceCount = deviceCounts[s.id]
                    return s
                })
                this.loading = false
            }
        },
        async countDevices () {
            // hardcoded device limit to ensure all are returned - feels dirty
            const data = await InstanceApi.getInstanceDevices(this.instance.id, null, 10000000)
            // map devices to snapshot deployed on that device
            const deviceCounts = data.devices.reduce((acc, device) => {
                const snapshot = device.activeSnapshot?.id
                if (!acc[snapshot]) {
                    acc[snapshot] = 1
                } else {
                    acc[snapshot]++
                }
                return acc
            }, {})
            return deviceCounts
        },
        // snapshot actions - delete
        showDeleteSnapshotDialog (snapshot) {
            Dialog.show({
                header: 'Delete Snapshot',
                text: 'Are you sure you want to delete this snapshot?',
                kind: 'danger',
                confirmLabel: 'Delete'
            }, async () => {
                await SnapshotApi.deleteSnapshot(this.instance.id, snapshot.id)
                const index = this.snapshots.indexOf(snapshot)
                this.snapshots.splice(index, 1)
                Alerts.emit('Successfully deleted snapshot.', 'confirmation')
            })
        },
        // snapshot actions - rollback
        showRollbackDialog (snapshot) {
            Dialog.show({
                header: 'Rollback Snapshot',
                html: `<p>This rollback will overwrite the current instance.</p>
            <p>All changes to the flows, settings and environment variables made since
                the last snapshot will be lost.</p>
            <p>Are you sure you want to rollback to this snapshot?</p>`,
                confirmLabel: 'Confirm Rollback'
            }, async () => {
                await SnapshotApi.rollbackSnapshot(this.instance.id, snapshot.id)
                Alerts.emit('Successfully rollbacked snapshot.', 'confirmation')
            })
        },
        // snapshot actions - set as device target
        showDeviceTargetDialog (snapshot) {
            Dialog.show({
                header: 'Set Device Target Snapshot',
                html: `<p>Are you sure you want to set this snapshot as the device target?</p>
            <p>All devices in this team will be restarted on this snapshot.</p>`,
                confirmLabel: 'Set Target'
            }, async () => {
                await InstanceApi.updateInstanceDeviceSettings(this.instance.id, {
                    targetSnapshot: snapshot.id
                })
                this.$emit('instance-updated')
            })
        },
        showCreateSnapshotDialog () {
            this.$refs.snapshotCreateDialog.show()
        },
        snapshotCreated (snapshot) {
            this.snapshots.unshift(snapshot)
            // on next tick, update the table data to ensure
            // the new snapshot is shown and the correct status are shown
            this.$emit('instance-updated')
        },
        async downloadSnapshotPackage (snapshot) {
            const ss = await SnapshotApi.getSnapshot(this.instance.id, snapshot.id)
            const packageJSON = {
                name: this.instance.safeName,
                description: `${snapshot.name} - ${snapshot.description}`,
                private: true,
                version: '0.0.0-' + snapshot.id,
                dependencies: ss.modules
            }
            const element = document.createElement('a')
            element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(JSON.stringify(packageJSON, null, 2)))
            element.setAttribute('download', 'package.json')
            element.style.display = 'none'
            document.body.appendChild(element)
            element.click()
            document.body.removeChild(element)
        }
    }
}
</script>
