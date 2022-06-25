<template>
    <form class="space-y-6">
        <ff-loading v-if="loading" message="Loading Snapshots..." />
        <template v-if="snapshots.length > 0">
            <template v-if="createSnapshotEnabled">
                <ff-button kind="primary" size="small" @click="showCreateSnapshotDialog"><template v-slot:icon-left><PlusSmIcon /></template>Create Snapshot</ff-button>
            </template>
            <ItemTable :items="snapshots" :columns="columns" @snapshotAction="snapshotAction"/>
        </template>
        <template v-else-if="!loading">
            <div class="flex flex-col text-gray-500 items-center italic mb-4 p-8 space-y-6">
                <div>You have not created any snapshots yet</div>
                <template v-if="createSnapshotEnabled">
                    <ff-button kind="primary" size="small" @click="showCreateSnapshotDialog"><template v-slot:icon-left><PlusSmIcon /></template>Create Snapshot</ff-button>
                </template>
            </div>
        </template>
        <ConfirmSnapshotDeleteDialog @deleteSnapshot="deleteSnapshot" ref="confirmSnapshotDeleteDialog" />
        <ConfirmSnapshotTargetDialog @targetSnapshot="targetSnapshot" ref="confirmSnapshotTargetDialog" />
        <ConfirmSnapshotRollbackDialog @rollbackSnapshot="rollbackSnapshot" ref="confirmSnapshotRollbackDialog" />
        <SnapshotCreateDialog :project="project"  @snapshotCreated="snapshotCreated" ref="snapshotCreateDialog" />
    </form>
</template>

<script>

import { markRaw } from 'vue'
import { mapState } from 'vuex'
import projectApi from '@/api/project'
import snapshotApi from '@/api/projectSnapshots'
import ItemTable from '@/components/tables/ItemTable'
import { PlusSmIcon, ChipIcon, ClockIcon } from '@heroicons/vue/outline'
import daysSince from '@/utils/daysSince'
import UserCell from '@/components/tables/cells/UserCell'
import SnapshotEditButton from './components/SnapshotEditButton'
import ConfirmSnapshotDeleteDialog from './dialogs/ConfirmSnapshotDeleteDialog'
import ConfirmSnapshotTargetDialog from './dialogs/ConfirmSnapshotTargetDialog'
import ConfirmSnapshotRollbackDialog from './dialogs/ConfirmSnapshotRollbackDialog'
import SnapshotCreateDialog from './dialogs/SnapshotCreateDialog'

const SnapshotMetaInformation = {
    template: `<div class="flex flex-col space-y-1 text-xs text-gray-500">
    <UserCell :avatar="user.avatar" :name="user.name" :username="user.username" />
    <span>{{since}}</span>
    </div>`,
    props: ['user', 'createdAt'],
    computed: {
        // localTime: function () {
        //     return new Date(this.createdAt).toLocaleString()
        // },
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
        snapshotAction (action, snapshotId) {
            const snapshot = this.snapshots.find(d => d.id === snapshotId)
            if (action === 'delete') {
                this.$refs.confirmSnapshotDeleteDialog.show(snapshot)
            } else if (action === 'rollback') {
                this.$refs.confirmSnapshotRollbackDialog.show(snapshot)
            } else if (this.features.devices) {
                if (action === 'setDeviceTarget') {
                    this.$refs.confirmSnapshotTargetDialog.show(snapshot)
                }
            }
        },
        showCreateSnapshotDialog () {
            this.$refs.snapshotCreateDialog.show()
        },
        snapshotCreated (snapshot) {
            this.snapshots.unshift(snapshot)
        },
        async deleteSnapshot (snapshot) {
            await snapshotApi.deleteSnapshot(this.project.id, snapshot.id)
            const index = this.snapshots.indexOf(snapshot)
            this.snapshots.splice(index, 1)
        },
        async rollbackSnapshot (snapshot) {
            await snapshotApi.rollbackSnapshot(this.project.id, snapshot.id)
        },
        async targetSnapshot (snapshot) {
            await projectApi.updateProjectDeviceSettings(this.project.id, {
                targetSnapshot: snapshot.id
            })
            this.$emit('projectUpdated')
        }
    },
    computed: {
        ...mapState('account', ['features']),
        createSnapshotEnabled: function () {
            // TODO: RBAC check
            return true
        },
        columns: function () {
            const devicesEnabled = this.features.devices
            const targetSnapshot = this.features.devices && this.project.deviceSettings?.targetSnapshot

            const SnapshotName = {
                template: `<div class="flex items-center">
                    <ClockIcon class="w-6 mr-2 text-gray-500" />
                    <div class="flex flex-grow flex-col space-y-1">
                        <span class="text-lg">{{name}}</span>
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
                { name: 'Snapshots', component: { is: markRaw(SnapshotName) } },
                // { name: '', class: ['w-56'], property: 'user', component: { is: UserCell } },
                { class: ['w-56'], component: { is: markRaw(SnapshotMetaInformation) } },
                { name: '', class: ['w-16'], component: { is: markRaw(SnapshotEditButton) } }
            ]
            return cols
        }
    },
    props: ['project'],
    components: {
        SnapshotCreateDialog,
        ConfirmSnapshotDeleteDialog,
        ConfirmSnapshotTargetDialog,
        ConfirmSnapshotRollbackDialog,
        ItemTable,
        PlusSmIcon
    }
}
</script>
