<template>
    <ff-dialog
        ref="dialog"
        header="Add Device to Instance"
        class="ff-dialog-fixed-height"
        confirm-label="Add"
        data-el="assign-device-dialog"
        @confirm="assignDevice()"
    >
        <template #default>
            <form class="space-y-6 mt-2 mb-2">
                <p class="text-sm text-gray-500">
                    Select the Node-RED instance you want to bind the device to.
                </p>
                <SelectInstance v-model="input.instance" :team="team" />
            </form>
        </template>
    </ff-dialog>
</template>

<script>
import { mapState } from 'vuex'

import SelectInstance from '../../../../components/SelectInstance.vue'

import alerts from '../../../../services/alerts.js'

export default {
    name: 'DeviceAssignInstanceDialog',
    components: {
        SelectInstance
    },
    setup () {
        return {
            async show (device) {
                this.$refs.dialog.show()
                this.device = device
            }
        }
    },
    data () {
        return {
            device: null,
            input: {
                instance: null
            }
        }
    },
    computed: {
        ...mapState('account', ['team'])
    },
    methods: {
        assignDevice () {
            this.$emit('assignDevice', this.device, this.input.instance.id)
            alerts.emit('Device successfully assigned to instance.', 'confirmation')
        }
    }
}
</script>
