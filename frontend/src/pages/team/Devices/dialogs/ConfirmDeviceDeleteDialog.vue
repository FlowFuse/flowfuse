<template>
    <ff-dialog :open="isOpen" header="Delete Device">
        <template v-slot:default>
            Are you sure you want to delete this device? Once deleted, there is no going back.
        </template>
        <template v-slot:actions>
            <ff-button kind="secondary" @click="close()">Cancel</ff-button>
            <ff-button kind="danger" class="ml-4" @click="confirm()">Delete</ff-button>
        </template>
    </ff-dialog>
</template>

<script>
import { ref } from 'vue'

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
            this.isOpen = false
        }
    },
    setup () {
        const isOpen = ref(false)
        return {
            isOpen,
            close () {
                isOpen.value = false
            },
            show (device) {
                this.device = device
                isOpen.value = true
            }
        }
    }
}
</script>
