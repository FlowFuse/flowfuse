<template>
    <ff-dialog ref="dialog" header="Rollback Snapshot" confirm-label="Confirm Rollback" @confirm="confirm()">
        <template v-slot:default>
            <p>This rollback will overwrite the current project.</p>
            <p>All changes to the flows, settings and environment variables made since
                the last snapshot will be lost.</p>
            <p>Are you sure you want to rollback to this snapshot?</p>
        </template>
    </ff-dialog>
</template>

<script>

export default {
    name: 'ConfirmSnapshotRollbackDialog',
    data () {
        return {
            snapshot: null
        }
    },
    methods: {
        confirm () {
            this.$emit('rollbackSnapshot', this.snapshot)
        }
    },
    setup () {
        return {
            show (snapshot) {
                this.$refs.dialog.show()
                this.snapshot = snapshot
            }
        }
    }
}
</script>
