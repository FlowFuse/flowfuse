<template>
    <ff-dialog header="Delete Device" :open="isOpen">
        <template v-slot:default>
            <form class="space-y-6" @submit="confirm()">
                <div class="mt-2 space-y-2">
                    <p>
                        Are you sure you want to delete this device? Once deleted, there is no going back.
                    </p>
                    <p>
                        Enter the device name to continue.
                        <code class="block">{{ device?.name }}</code>
                    </p>
                </div>
                <FormRow v-model="input.deviceName" id="deviceName">Name</FormRow>
            </form>
        </template>
        <template v-slot:actions>
            <ff-button kind="secondary" @click="close()">Cancel</ff-button>
            <ff-button kind="danger" :disabled="!formValid" class="ml-4" @click="confirm()">Delete</ff-button>
        </template>
    </ff-dialog>
</template>

<script>
import { ref } from 'vue'

import FormRow from '@/components/FormRow'

export default {
    name: 'ConfirmDeviceDeleteDialog',
    emits: ['delete-device'],
    components: {
        FormRow
    },
    data () {
        return {
            input: {
                projectName: ''
            },
            formValid: false,
            device: null
        }
    },
    watch: {
        input: {
            handler: function (v) {
                this.formValid = this.device.name === v.deviceName
            },
            deep: true
        }
    },
    methods: {
        confirm () {
            if (this.formValid) {
                this.$emit('delete-device')
                this.isOpen = false
            }
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
