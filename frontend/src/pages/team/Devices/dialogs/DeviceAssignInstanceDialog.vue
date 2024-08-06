<template>
    <ff-dialog
        ref="dialog"
        :header="bulkOp ? 'Move Selected Devices to Instance' : 'Add Device to Instance'"
        class="ff-dialog-fixed-height"
        :confirm-label="bulkOp ? 'Move' : 'Add'"
        data-el="assign-device-to-instance-dialog"
        @confirm="assignDevice()"
    >
        <template #default>
            <form class="space-y-6 mt-2 mb-2">
                <p>The following device{{ devices.length > 1 ? 's' : '' }} will be affected by this operation:</p>
                <div class="max-h-48 overflow-y-auto">
                    <ul class="list-disc list-inside">
                        <li v-for="device in devices" :key="device.id">
                            <span class="font-bold">{{ device.name }}</span> <span class="text-gray-500 text-sm"> ({{ device.id }})</span>
                        </li>
                    </ul>
                </div>
                <hr>
                <p>Select the Node-RED instance you want to bind the device{{ devices.length > 1 ? 's' : '' }} to.</p>
                <SelectInstance v-model="input.instance" :team="team" />
            </form>
        </template>
    </ff-dialog>
</template>

<script>
import { mapState } from 'vuex'

import SelectInstance from '../../../../components/SelectInstance.vue'

export default {
    name: 'DeviceAssignInstanceDialog',
    components: {
        SelectInstance
    },
    emits: ['assignDevice', 'moveDevices'],
    setup () {
        return {
            async show (selection) {
                this.$refs.dialog.show()
                this.selection = selection
            }
        }
    },
    data () {
        return {
            selection: null,
            input: {
                instance: null
            }
        }
    },
    computed: {
        ...mapState('account', ['team']),
        bulkOp () {
            return Array.isArray(this.selection)
        },
        devices () {
            return this.bulkOp ? this.selection : [this.selection]
        }
    },
    methods: {
        assignDevice () {
            if (this.bulkOp) {
                this.$emit('moveDevices', this.selection, this.input.instance.id)
            } else {
                this.$emit('assignDevice', this.selection, this.input.instance.id)
            }
        }
    }
}
</script>
