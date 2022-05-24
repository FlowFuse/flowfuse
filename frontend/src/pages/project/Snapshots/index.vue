<template>
    <form class="space-y-6">
        <template v-if="snapshots.length > 0">
            <template v-if="createSnapshotEnabled">
                <ff-button kind="primary" size="small" @click="showCreateSnapshotDialog"><template v-slot:icon-left><PlusSmIcon /></template>Create Snapshot</ff-button>
            </template>
            <ItemTable :items="snapshots" :columns="columns" @snapshotAction="snapshotAction"/>
        </template>
        <template v-else>
            <div class="flex flex-col text-gray-500 items-center italic mb-4 p-8 space-y-6">
                <div>You have not created any snapshots yet</div>
                <template v-if="createSnapshotEnabled">
                    <ff-button kind="primary" size="small" @click="showCreateSnapshotDialog"><template v-slot:icon-left><PlusSmIcon /></template>Create Snapshot</ff-button>
                </template>
            </div>
        </template>
        <ConfirmSnapshotDeleteDialog @deleteSnapshot="deleteSnapshot" ref="confirmSnapshotDeleteDialog" />
        <ConfirmSnapshotTargetDialog @targetSnapshot="targetSnapshot" ref="confirmSnapshotTargetDialog" />
        <SnapshotCreateDialog :project="project"  @snapshotCreated="snapshotCreated" ref="snapshotCreateDialog" />
    </form>
</template>

<script>

import { markRaw } from 'vue'
import { mapState } from 'vuex'
import projectApi from '@/api/project'
import snapshotApi from '@/api/projectSnapshots'
import ItemTable from '@/components/tables/ItemTable'
import { PlusSmIcon, ChipIcon } from '@heroicons/vue/outline'

import SnapshotEditButton from './components/SnapshotEditButton'

import ConfirmSnapshotDeleteDialog from './dialogs/ConfirmSnapshotDeleteDialog'
import ConfirmSnapshotTargetDialog from './dialogs/ConfirmSnapshotTargetDialog'
import SnapshotCreateDialog from './dialogs/SnapshotCreateDialog'

export default {
    name: 'ProjectSnapshots',
    data () {
        return {
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
                const data = await snapshotApi.getProjectSnapshots(this.project.id)
                this.snapshots = data.snapshots
            }
        },
        snapshotAction (action, snapshotId) {
            const snapshot = this.snapshots.find(d => d.id === snapshotId)
            if (action === 'delete') {
                this.$refs.confirmSnapshotDeleteDialog.show(snapshot)
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
            this.snapshots.push(snapshot)
        },
        async deleteSnapshot (snapshot) {
            await snapshotApi.deleteSnapshot(this.project.id, snapshot.id)
            const index = this.snapshots.indexOf(snapshot)
            this.snapshots.splice(index, 1)
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
            const cols = [
                { name: 'Snapshot', class: ['w-20'], property: 'id' },
                { name: 'Name', property: 'name' },
                { name: 'Created', class: ['w-56'], property: 'createdAt' }
            ]
            const targetSnapshot = this.project.deviceSettings.targetSnapshot
            const activeFlag = {
                template: '<span class="flex justify-center text-gray-500"><template v-if="active"><ChipIcon class="w-4"/></template></span>',
                props: ['id'],
                computed: {
                    active: function () {
                        return this.id === targetSnapshot
                    }
                },
                components: {
                    ChipIcon
                }
            }

            if (this.features.devices) {
                cols.push(
                    { name: 'Devices', class: ['w-16'], property: 'deviceCount' },
                    { name: 'Target', class: ['w-16'], component: { is: markRaw(activeFlag) } }
                )
            }
            cols.push({ name: '', class: ['w-16'], component: { is: markRaw(SnapshotEditButton) } })
            return cols
        }
    },
    props: ['project'],
    components: {
        SnapshotCreateDialog,
        ConfirmSnapshotDeleteDialog,
        ConfirmSnapshotTargetDialog,
        ItemTable,
        PlusSmIcon
    }
}
</script>
