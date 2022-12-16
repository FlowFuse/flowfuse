<template>
    <SectionTopMenu hero="Project Snapshots" help-header="FlowForge - Project Snapshots" info="">
        <template v-slot:pictogram>
            <img src="../../../images/pictograms/time_red.png" />
        </template>
        <template v-slot:helptext>
            <p>Snapshots generate a point-in-time backup of your Node-RED flow, credentials and runtime settings.</p>
            <p>Snapshots are also required for deploying to devices. In the Deployments page of a Project, you can define your “Target Snapshot”, which will then be deployed to all connected devices.</p>
        </template>
    </SectionTopMenu>
    <div class="space-y-6">
        <ff-loading v-if="loading" message="Loading Snapshots..." />
        <template v-if="snapshots.length > 0">
            <ff-data-table data-el="snapshots" class="space-y-4" :columns="columns" :rows="snapshots" :show-search="true" search-placeholder="Search Snapshots...">
                <template v-slot:actions v-if="hasPermission('project:snapshot:create')">
                    <ff-button kind="primary" @click="showCreateSnapshotDialog" data-action="create-snapshot"><template v-slot:icon-left><PlusSmIcon /></template>Create Snapshot</ff-button>
                </template>
                <template v-if="showContextMenu" v-slot:context-menu="{row}">
                    <ff-list-item v-if="hasPermission('project:snapshot:rollback')" label="Rollback" @click="showRollbackDialog(row)" />
                    <ff-list-item v-if="hasPermission('project:snapshot:set-target')" label="Set as Device Target" @click="showDeviceTargetDialog(row)"/>
                    <ff-list-item v-if="hasPermission('project:snapshot:delete')" label="Delete Snapshot" kind="danger" @click="showDeleteSnapshotDialog(row)"/>
                </template>
            </ff-data-table>
        </template>
        <template v-else-if="!loading">
            <div class="flex flex-col text-gray-500 items-center italic mb-4 p-8 space-y-6">
                <div>You have not created any snapshots yet</div>
                <template v-if="hasPermission('project:snapshot:create')">
                    <ff-button kind="primary" size="small" data-action="create-snapshot" @click="showCreateSnapshotDialog"><template v-slot:icon-left><PlusSmIcon /></template>Create Snapshot</ff-button>
                </template>
            </div>
        </template>
        <SnapshotCreateDialog data-el="dialog-create-snapshot" :project="project" @snapshotCreated="snapshotCreated" ref="snapshotCreateDialog" />
    </div>
</template>

<script>

import { PlusSmIcon } from '@heroicons/vue/outline'
import { markRaw } from 'vue'
import { mapState } from 'vuex'

import SectionTopMenu from '@/components/SectionTopMenu'

import DaysSince from './components/cells/DaysSince'
import SnapshotName from './components/cells/SnapshotName'
import DeviceCount from './components/cells/DeviceCount'
import SnapshotCreateDialog from './dialogs/SnapshotCreateDialog'

import projectApi from '@/api/project'
import snapshotApi from '@/api/projectSnapshots'
import UserCell from '@/components/tables/cells/UserCell'
import permissionsMixin from '@/mixins/Permissions'
import Alerts from '@/services/alerts'
import Dialog from '@/services/dialog'

export default {
    name: 'ProjectSnapshots',
    mixins: [permissionsMixin],
    data () {
        return {
            loading: false,
            deviceCounts: {},
            snapshots: []
        }
    },
    watch: {
        team: 'fetchData',
        project: 'fetchData'
    },
    mounted () {
        this.fetchData()
    },
    methods: {
        fetchData: async function (newVal) {
            if (this.project.id) {
                this.loading = true
                const deviceCounts = await this.countDevices()
                const data = await snapshotApi.getProjectSnapshots(this.project.id)
                this.snapshots = data.snapshots.map((s) => {
                    s.deviceCount = deviceCounts[s.id]
                    return s
                })
                this.loading = false
            }
        },
        async countDevices () {
            // hardcoded device limit to ensure all are returned - feels dirty
            const data = await projectApi.getProjectDevices(this.project.id, null, 10000000)
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
                await snapshotApi.deleteSnapshot(this.project.id, snapshot.id)
                const index = this.snapshots.indexOf(snapshot)
                this.snapshots.splice(index, 1)
                Alerts.emit('Successfully deleted snapshot.', 'confirmation')
            })
        },
        // snapshot actions - rollback
        showRollbackDialog (snapshot) {
            Dialog.show({
                header: 'Rollback Snapshot',
                html: `<p>This rollback will overwrite the current project.</p>
            <p>All changes to the flows, settings and environment variables made since
                the last snapshot will be lost.</p>
            <p>Are you sure you want to rollback to this snapshot?</p>`,
                confirmLabel: 'Confirm Rollback'
            }, async () => {
                await snapshotApi.rollbackSnapshot(this.project.id, snapshot.id)
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
                await projectApi.updateProjectDeviceSettings(this.project.id, {
                    targetSnapshot: snapshot.id
                })
                this.$emit('projectUpdated')
            })
        },
        showCreateSnapshotDialog () {
            this.$refs.snapshotCreateDialog.show()
        },
        snapshotCreated (snapshot) {
            this.snapshots.unshift(snapshot)
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
                            targetSnapshot: this.project.deviceSettings?.targetSnapshot
                        }
                    }
                },
                {
                    label: '',
                    component: {
                        is: markRaw(DeviceCount),
                        extraProps: {
                            targetSnapshot: this.project.deviceSettings?.targetSnapshot
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
    props: ['project'],
    components: {
        SnapshotCreateDialog,
        PlusSmIcon,
        SectionTopMenu
    }
}
</script>
