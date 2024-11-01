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

        <template v-if="hasPermission('application:device-group:update')">
            <FormHeading class="text-red-700">Clear Target Snapshot</FormHeading>
            <div class="flex flex-col space-y-4 max-w-2xl lg:flex-row lg:items-center lg:space-y-0">
                <div class="flex-grow">
                    <div class="max-w-sm pr-2">Clearing the groups target snapshot will reset the target of all devices in the group.</div>
                </div>
                <div class="min-w-fit flex-shrink-0">
                    <ff-button class="w-36" kind="danger" data-action="clear-device-group-target-snapshot" :disabled="!hasTargetSnapshot" @click="clearTargetSnapshot">Clear Target</ff-button>
                </div>
            </div>
        </template>
        <template v-if="hasPermission('application:device-group:delete')">
            <FormHeading class="text-red-700">Delete Device Group</FormHeading>
            <div class="flex flex-col space-y-4 max-w-2xl lg:flex-row lg:items-center lg:space-y-0">
                <div class="flex-grow">
                    <div class="max-w-sm pr-2">Deleting the device group will reset all devices in the group. This action cannot be undone.</div>
                </div>
                <div class="min-w-fit flex-shrink-0">
                    <ff-button class="w-36" kind="danger" data-action="delete-device-group" @click="deleteGroup">Delete Group</ff-button>
                </div>
            </div>
        </template>
    </form>
</template>

<script>
import { mapState } from 'vuex'

import ApplicationApi from '../../../../api/application.js'
import FormHeading from '../../../../components/FormHeading.vue'
import FormRow from '../../../../components/FormRow.vue'
import permissionsMixin from '../../../../mixins/Permissions.js'
import Alerts from '../../../../services/alerts.js'
import Dialog from '../../../../services/dialog.js'

export default {
    name: 'ApplicationDeviceGroupSettingsGeneral',
    components: {
        FormRow,
        FormHeading
    },
    mixins: [permissionsMixin],
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
        ...mapState('account', ['teamMembership']),
        unsavedChanges () {
            return this.deviceGroup ? (this.input.name !== this.deviceGroup.name || this.input.description !== this.deviceGroup.description) : false
        },
        hasError () {
            return !!this.errors.name
        },
        hasTargetSnapshot () {
            return !!this.deviceGroup?.targetSnapshot
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
            const response = await ApplicationApi.updateDeviceGroup(this.application.id, this.deviceGroup.id, this.input.name, this.input.description, undefined)
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
        },
        clearTargetSnapshot () {
            if (!this.application.id || !this.deviceGroup.id) {
                return
            }
            Dialog.show({
                header: 'Clear Target Snapshot',
                kind: 'danger',
                text: `Are you sure you want to clear the target snapshot?
                       This will cause all devices in the group to to have their target snapshot setting cleared.`,
                confirmLabel: 'Clear'
            }, async () => {
                try {
                    const response = await ApplicationApi.updateDeviceGroup(this.application.id, this.deviceGroup.id, undefined, undefined, null)
                    if (response.status === 200) {
                        this.$emit('device-group-updated')
                        Alerts.emit('Device Group Target Snapshot was cleared', 'confirmation')
                    } else {
                        Alerts.emit('Failed to clear the Target Snapshot', 'warning', 5000)
                    }
                } catch (error) {
                    const msg = error.response?.data?.error || 'Error clearing device groups Target Snapshot'
                    Alerts.emit(msg, 'warning', 5000)
                }
            })
        }
    }
}
</script>
