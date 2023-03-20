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
                    Select the instance to add the device to:
                </p>
                <FormRow
                    v-model="input.project"
                    :options="options"
                    :disabled="disabled"
                    :placeholder="placeholder"
                    data-form="instance"
                >
                    Application Instance
                </FormRow>
            </form>
        </template>
    </ff-dialog>
</template>

<script>
import FormRow from '@/components/FormRow'
import alerts from '@/services/alerts'

export default {
    name: 'DeviceAssignInstanceDialog',
    components: {
        FormRow
    },
    props: {
        instances: {
            type: Array,
            default: null
        }
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
            projects: [],
            input: {
                project: null
            }
        }
    },
    computed: {
        options () {
            return this.instances?.map(d => { return { value: d.id, label: d.name } }) ?? []
        },

        placeholder () {
            if (this.loadingInstances) {
                return 'Loading...'
            } else if (this.noInstances) {
                return 'No instances found.'
            }

            return undefined
        },

        noInstances () {
            return this.instances?.length === 0
        },

        loadingInstances () {
            return !this.instances
        },

        disabled () {
            return this.noInstances || this.loadingInstances
        }
    },
    methods: {
        assignDevice () {
            this.$emit('assignDevice', this.device, this.input.project)
            alerts.emit('Device successfully assigned to instance.', 'confirmation')
        }
    }
}
</script>
