<template>
    <ff-dialog ref="dialog" :header="'Delete Device: \'' + device?.name + '\''" kind="danger" confirm-label="Delete" @confirm="confirm()" :disable-primary="!formValid">
        <template #default>
            <form class="space-y-4" @submit.prevent>
                <p>
                    Are you sure you want to delete this device? Once deleted, there is no going back.
                </p>
                <p>
                    Name: <span class="font-bold">{{ device?.name }}</span>
                </p>
                <p>
                    Please type in the device name to confirm.
                </p>
                <FormRow v-model="input.deviceName" :placeholder="'Device Name'" id="deviceName" />
            </form>
        </template>
    </ff-dialog>
</template>

<script>

import FormRow from '../../../../components/FormRow.vue'

export default {
    name: 'ConfirmDeviceDeleteDialog',
    emits: ['delete-device'],
    components: {
        FormRow
    },
    data () {
        return {
            input: {
                deviceName: ''
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
