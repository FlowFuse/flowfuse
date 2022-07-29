<template>
    <ff-dialog ref="dialog" header="Delete Device" kind="danger" confirm-label="Delete" @confirm="confirm()">
        <template v-slot:default>
            Are you sure you want to delete this device? Once deleted, there is no going back.
        </template>
    </ff-dialog>
</template>

<script>

import alerts from '@/services/alerts'

export default {
    name: 'ConfirmDeviceDeleteDialog',
    data () {
        return {
            device: null
        }
    },
    methods: {
        confirm () {
            this.$emit('deleteDevice', this.device)
            alerts.emit('Successfully deleted the device.', 'confirmation')
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
