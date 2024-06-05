<template>
    <form class="space-y-4" @submit.prevent>
        <FormHeading class="mt-0.5">Device Group Settings</FormHeading>
        <FormRow v-model="input.name" data-el="application-device-group-name" type="text" :error="errors.name" :disabled="!!errors.name">
            The name of the group
        </FormRow>
        <FormRow v-model="input.description" data-el="application-device-group-description" type="text">
            A description of the group
        </FormRow>
        <ff-button size="small" :disabled="!unsavedChanges || hasError" @click="saveSettings()">Save Settings</ff-button>
        <FormHeading class="text-red-700">Danger Zone</FormHeading>
        <FormRow wrapperClass="block">
            Note that these action cannot be undone.
            <template #input>
                <div class="flex justify-between items-center">
                    <ff-button kind="danger" @click="deleteGroup">Delete Device Group</ff-button>
                </div>
            </template>
        </FormRow>
    </form>
</template>

<script>
import ApplicationApi from '../../../api/application.js'
import FormHeading from '../../../components/FormHeading.vue'
import FormRow from '../../../components/FormRow.vue'
import Alerts from '../../../services/alerts.js'
import Dialog from '../../../services/dialog.js'

export default {
    name: 'ApplicationDeviceGroupSettings',
    components: {
        FormRow,
        FormHeading
    },
    props: {
        application: {
            type: Object,
            required: true
        },
        deviceGroup: {
            type: Object,
            required: true
        }
    },
    emits: ['device-group-updated'],
    data () {
        return {
            input: {
                name: '',
                description: ''
            },
            errors: {
                name: ''
            }
        }
    },
    computed: {
        unsavedChanges () {
            return this.deviceGroup ? (this.input.name !== this.deviceGroup.name || this.input.description !== this.deviceGroup.description) : false
        },
        hasError () {
            return !!this.errors.name
        }
    },
    watch: {
        'application.id': 'initInputObject',
        'deviceGroup.id': 'initInputObject'
    },
    created () {
        this.initInputObject()
    },
    mounted () {
        this.initInputObject()
    },
    onMounted () {
        this.initInputObject()
    },
    methods: {
        async initInputObject () {
            if (!this.application.id) {
                return
            }
            this.input.name = this.deviceGroup.name
            this.input.description = this.deviceGroup.description
        },
        async saveSettings () {
            if (!this.application.id) {
                return
            }
            const response = await ApplicationApi.updateDeviceGroup(this.application.id, this.deviceGroup.id, this.input.name, this.input.description)
            if (response.status === 200) {
                this.$emit('device-group-updated')
                Alerts.emit('Device Group settings saved', 'confirmation')
            } else {
                Alerts.emit('Failed to update device group settings', 'warning', 5000)
            }
        },
        deleteGroup () {
            if (!this.application.id || !this.deviceGroup.id) {
                return
            }
            Dialog.show({
                header: 'Delete Account',
                kind: 'danger',
                text: `Are you sure you want to delete this device group?
                       This action cannot be undone.`,
                confirmLabel: 'Delete'
            }, async () => {
                try {
                    const response = await ApplicationApi.deleteDeviceGroup(this.application.id, this.deviceGroup.id)
                    if (response.status === 200) {
                        Alerts.emit('Device Group deleted', 'confirmation')
                        this.$router.push({
                            name: 'ApplicationDeviceGroups',
                            params: {
                                id: this.application.id
                            }
                        })
                    } else {
                        Alerts.emit('Failed to delete device group', 'warning', 5000)
                    }
                } catch (error) {
                    const msg = error.response?.data?.error || 'Error deleting device group'
                    Alerts.emit(msg, 'warning', 5000)
                }
            })
        }
    }
}
</script>
