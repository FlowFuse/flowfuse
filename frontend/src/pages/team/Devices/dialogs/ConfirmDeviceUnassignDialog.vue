<template>
    <ff-dialog ref="dialog" header="Remove Device from Project" kind="danger" confirm-label="Remove" @confirm="confirm()">
        <template v-slot:default>
            Are you sure you want to remove this device from the project? This will stop the project
            running on the device.
        </template>
    </ff-dialog>
</template>

<script>

import alerts from '@/services/alerts'

export default {
    name: 'ConfirmDeviceUnassignDialog',
    data () {
        return {
            device: null
        }
    },
    methods: {
        confirm () {
            this.$emit('unassignDevice', this.device)
            alerts.emit('Successfully unassigned the project from this device.', 'confirmation')
        }
    },
    setup () {
        return {
            show (device) {
                this.device = device
                this.$refs.dialog.show()
            }
        }
    }
}
</script>
