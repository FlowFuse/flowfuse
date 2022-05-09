<template>
    <ff-dialog :open="isOpen" header="Remove Device from Project">
        <template v-slot:default>
            Are you sure you want to remove this device from the project? This will stop the project
            running on the device.
        </template>
        <template v-slot:actions>
            <ff-button kind="secondary" @click="close()">Cancel</ff-button>
            <ff-button kind="danger" class="ml-4" @click="confirm()">Remove</ff-button>
        </template>
    </ff-dialog>
</template>

<script>
import { ref } from 'vue'

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
