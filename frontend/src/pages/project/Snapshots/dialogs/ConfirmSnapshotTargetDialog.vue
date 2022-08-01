<template>
    <ff-dialog ref="dialog" header="Set Device Target Snapshot" confirm-label="Set Target" @confirm="confirm()">
        <template v-slot:default>
            <p>Are you sure you want to set this snapshot as the device target?</p>
            <p>All devices in this team will be restarted on this snapshot.</p>
        </template>
    </ff-dialog>
</template>

<script>

import alerts from '@/services/alerts'

export default {
    name: 'ConfirmSnapshotTargetDialog',
    data () {
        return {
            snapshot: null
        }
    },
    methods: {
        confirm () {
            this.$emit('targetSnapshot', this.snapshot)
            alerts.emit('Successfully set snapshot as device target.', 'confirmation')
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
