<template>
    <form class="space-y-4" @submit.prevent>
        <section data-el="device-group-settings-general">
            <FormHeading class="mt-0.5">{{ $t('ui.deviceGroupSettings') }}</FormHeading>
            <FormRow
                v-model="input.name" data-el="application-device-group-name"
                :type="!hasPermission('application:device-group:update', { application }) ? 'uneditable' : 'text'"
                :error="errors.name"
                :disabled="!!errors.name"
            >
                {{ $t('ui.theNameOfTheGroup') }}
            </FormRow>
            <FormRow
                v-model="input.description" data-el="application-device-group-description"
                :type="!hasPermission('application:device-group:update', { application }) ? 'uneditable' : 'text'"
            >
                {{ $t('ui.aDescriptionOfTheGroup') }}
            </FormRow>
            <ff-button
                v-if="hasPermission('application:device-group:update', { application })"
                size="small" :disabled="!unsavedChanges || hasError" data-action="save-general-settings"
                @click="saveSettings()"
            >
                {{ $t('ui.saveSettings') }}
            </ff-button>
        </section>

        <section v-if="hasPermission('application:device-group:update', { application })" data-el="target-snapshot">
            <FormHeading class="text-red-700">{{ $t('ui.clearTargetSnapshot') }}</FormHeading>
            <div class="flex flex-col space-y-4 max-w-2xl lg:flex-row lg:items-center lg:space-y-0">
                <div class="grow">
                    <div class="max-w-sm pr-2">{{ $t('ui.clearingTheGroupsTargetSnapshotWillResetTheTarge') }}</div>
                </div>
                <div class="min-w-fit shrink-0">
                    <ff-button class="w-36" kind="danger" data-action="clear-device-group-target-snapshot" :disabled="!hasTargetSnapshot" @click="clearTargetSnapshot">{{ $t('ui.clearTarget') }}</ff-button>
                </div>
            </div>
        </section>

        <section v-if="hasPermission('application:device-group:delete', { application })" data-el="delete-device-group">
            <FormHeading class="text-red-700">{{ $t('ui.deleteDeviceGroup') }}</FormHeading>
            <div class="flex flex-col space-y-4 max-w-2xl lg:flex-row lg:items-center lg:space-y-0">
                <div class="grow">
                    <div class="max-w-sm pr-2">{{ $t('ui.deletingTheDeviceGroupWillResetAllDevicesInTheGr') }}</div>
                </div>
                <div class="min-w-fit shrink-0">
                    <ff-button class="w-36" kind="danger" data-action="delete-device-group" @click="deleteGroup">{{ $t('ui.deleteGroup') }}</ff-button>
                </div>
            </div>
        </section>
    </form>
</template>

<script>
import ApplicationApi from '../../../../api/application.js'
import FormHeading from '../../../../components/FormHeading.vue'
import FormRow from '../../../../components/FormRow.vue'
import usePermissions from '../../../../composables/Permissions.js'
import { t } from '../../../../i18n.js'
import Alerts from '../../../../services/alerts.js'
import Dialog from '../../../../services/dialog.js'

export default {
    name: 'application-device-group-settings-general',
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
    setup () {
        const { hasPermission } = usePermissions()

        return { hasPermission }
    },
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
                header: t('ui.deleteAccount'),
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
                            name: 'application-device-groups',
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
                header: t('ui.clearTargetSnapshot'),
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
