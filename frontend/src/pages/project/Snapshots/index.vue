<template>
    <form class="space-y-6">
        <template v-if="snapshots.length > 0">
            <template v-if="createSnapshotEnabled">
                <ff-button kind="primary" size="small" @click="showCreateSnapshotDialog"><template v-slot:icon-left><PlusSmIcon /></template>Create Snapshot</ff-button>
            </template>
            <ItemTable :items="snapshots" :columns="columns" @snapshotAction="snapshotAction"/>
        </template>
        <template v-else>
            <div class="flex text-gray-500 justify-center italic mb-4 p-8">
                You have not created any snapshots yet
            </div>
        </template>
        <ConfirmSnapshotDeleteDialog @deleteSnapshot="deleteSnapshot" ref="confirmSnapshotDeleteDialog" />
        <SnapshotCreateDialog :project="project"  @snapshotCreated="snapshotCreated" ref="snapshotCreateDialog" />
    </form>
</template>

<script>

import { markRaw } from 'vue'
import { mapState } from 'vuex'
import snapshotApi from '@/api/projectSnapshots'
import ItemTable from '@/components/tables/ItemTable'
import { PlusSmIcon } from '@heroicons/vue/outline'

import SnapshotEditButton from './components/SnapshotEditButton'

import ConfirmSnapshotDeleteDialog from './dialogs/ConfirmSnapshotDeleteDialog'
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
                { name: 'Snapshot', property: 'id' },
                { name: 'Name', property: 'name' },
                { name: 'Created', property: 'createdAt' },
                { name: '', class: ['w-16'], component: { is: markRaw(SnapshotEditButton) } }
            ]
            return cols
        }
    },
    props: ['project'],
    components: {
        SnapshotCreateDialog,
        ConfirmSnapshotDeleteDialog,
        ItemTable,
        PlusSmIcon
    }
}
</script>
