<template>
    <ff-dialog ref="dialog" header="Delete Device" kind="danger" confirm-label="Delete" @confirm="confirm()" :disable-primary="!formValid">
        <template v-slot:default>
            <form class="space-y-6" @submit.prevent>
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
    </ff-dialog>
</template>

<script>

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
            }
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
