<template>
    <ff-dialog ref="dialog" header="Delete Snapshot" kind="danger" confirm-label="Delete" @confirm="confirm()">
        <template v-slot:default>
            Are you sure you want to delete this snapshot?
        </template>
    </ff-dialog>
</template>

<script>

import alerts from '@/services/alerts'

export default {
    name: 'ConfirmSnapshotDeleteDialog',
    data () {
        return {
            snapshot: null
        }
    },
    methods: {
        confirm () {
            this.$emit('deleteSnapshot', this.snapshot)
            alerts.emit('Successfully deleted snapshot.', 'confirmation')
        }
    },
    setup () {
        return {
            show (snapshot) {
                this.snapshot = snapshot
                this.$refs.dialog.show()
            }
        }
    }
}
</script>
