<template>
    <form class="space-y-6">
        <ff-loading v-if="loading" message="Loading Snapshots..." />
        <template v-if="snapshots.length > 0">
            <ff-data-table data-el="snapshots" :columns="columns" :rows="snapshots" :show-search="true" search-placeholder="Search Snapshots...">
                <template v-slot:actions v-if="canCreateSnapshot">
                    <ff-button kind="primary" @click="showCreateSnapshotDialog" data-action="create-snapshot"><template v-slot:icon-left><PlusSmIcon /></template>Create Snapshot</ff-button>
                </template>
                <template v-slot:context-menu="{row}">
                    <ff-list-item label="Rollback" @click="showRollbackDialog(row)" />
                    <ff-list-item v-if="features.devices" label="Set as Device Target" @click="showDeviceTargetDialog(row)"/>
                    <ff-list-item v-if="canDelete" label="Delete Snapshot" kind="danger" @click="showDeleteSnapshotDialog(row)"/>
                </template>
            </ff-data-table>
        </template>
        <template v-else-if="!loading">
            <div class="flex flex-col text-gray-500 items-center italic mb-4 p-8 space-y-6">
                <div>You have not created any snapshots yet</div>
                <template v-if="canCreateSnapshot">
                    <ff-button kind="primary" size="small" data-action="create-snapshot" @click="showCreateSnapshotDialog"><template v-slot:icon-left><PlusSmIcon /></template>Create Snapshot</ff-button>
                </template>
            </div>
        </template>
        <SnapshotCreateDialog :project="project" @snapshotCreated="snapshotCreated" ref="snapshotCreateDialog" />
    </form>
</template>

<script>

import { markRaw } from 'vue'
import { mapState } from 'vuex'
import { Roles } from '@core/lib/roles'

import Alerts from '@/services/alerts'
import Dialog from '@/services/dialog'

import projectApi from '@/api/project'
import snapshotApi from '@/api/projectSnapshots'
import { PlusSmIcon, ChipIcon, ClockIcon } from '@heroicons/vue/outline'
import daysSince from '@/utils/daysSince'
import UserCell from '@/components/tables/cells/UserCell'
import SnapshotCreateDialog from './dialogs/SnapshotCreateDialog'

const SnapshotMetaInformation = {
    template: `<div class="flex flex-col space-y-1 text-xs text-gray-500">
    <UserCell :avatar="user.avatar" :name="user.name" :username="user.username" />
    <span>{{since}}</span>
    </div>`,
    props: ['user', 'createdAt'],
    computed: {
        since: function () {
            return daysSince(this.createdAt)
        }
    },
    components: { UserCell }
}

export default {
    name: 'ProjectSnapshots',
    data () {
        return {
            loading: false,
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
            this.loading = true
            if (this.project.id) {
                const data = await snapshotApi.getProjectSnapshots(this.project.id)
                this.snapshots = data.snapshots
            }
            this.loading = false
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
        ...mapState('account', ['features', 'teamMembership']),
        canDelete: function () {
            return this.teamMembership?.role >= Roles.Owner
        },
        canCreateSnapshot: function () {
            return this.teamMembership?.role >= Roles.Member
        },
        columns: function () {
            const devicesEnabled = this.features.devices
            const targetSnapshot = this.features.devices && this.project.deviceSettings?.targetSnapshot

            const SnapshotName = {
                template: `<div class="flex items-center">
                    <ClockIcon class="w-6 mr-2 text-gray-500" />
                    <div class="flex flex-grow flex-col space-y-1">
                        <span class="text-md">{{name}}</span>
                        <span class="text-xs text-gray-500">id: {{id}}</span>
                        <template v-if="description">
                        <details class="text-gray-500 float-left">
                            <summary class="cursor-pointer">Description</summary>
                            <div class="whitespace-pre-line absolute border drop-shadow-md rounded bg-white p-2" style="max-width: 300px;">{{description}}</div>
                        </details>
                        </template>
                    </div>
                    <div v-if="active" class="flex border border-green-400 rounded-full bg-green-200 py-1 px-2 text-xs">
                        <ChipIcon class="w-4 mr-1" />
                        <span>active</span>
                    </div>
                </div>`,
                props: ['id', 'name', 'description'],
                components: { ClockIcon, ChipIcon },
                computed: {
                    active: function () {
                        return devicesEnabled && this.id === targetSnapshot
                    }
                }
            }

            const cols = [
                { label: 'Snapshots', component: { is: markRaw(SnapshotName) } },
                { class: ['w-56'], component: { is: markRaw(SnapshotMetaInformation) } }
            ]
            return cols
        }
    },
    props: ['project'],
    components: {
        SnapshotCreateDialog,
        PlusSmIcon
    }
}
</script>
