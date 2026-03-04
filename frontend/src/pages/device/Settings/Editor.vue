<template>
    <form class="space-y-4" data-el="instance-editor" @submit.prevent>
        <FormHeading>Editor</FormHeading>
        <FormHeading class="pt-8">Limits</FormHeading>
        <div v-if="limitAvailable">
            <div v-if="limitsLauncherEnabled">
                <div class="flex flex-col sm:flex-row">
                    <div class="w-full max-w-md sm:mr-8">
                        <FormRow v-model="editable.settings.apiMaxLength" :error="editable.errors.apiMaxLength" type="text">
                            Max HTTP Payload Size
                            <template #description>
                                The maximum number of bytes allowed in a HTTP Request in bytes ('kb','mb' modifiers allowed)
                            </template>
                            <template #append><ChangeIndicator :value="editable.changed.apiMaxLength" /></template>
                        </FormRow>
                    </div>
                </div>
            </div>
            <div v-else class="flex flex-col sm:flex-row">
                <div class="space-y-4 w-full max-w-md sm:mr-8">
                    Upgrade your Device Agent to be able to set apiMaxLength or debugMaxLength
                </div>
            </div>
        </div>
        <div v-if="hasPermission('device:edit-env')" class="space-x-4 whitespace-nowrap">
            <ff-button data-el="submit" size="small" :disabled="!unsavedChanges || editable.hasErrors" @click="saveSettings()">
                Save Settings
            </ff-button>
        </div>
    </form>
</template>

<script>
import semver from 'semver'

import { mapState } from 'vuex'

import deviceApi from '../../../api/devices.js'
import usePermissions from '../../../composables/Permissions.js'

import Alerts from '../../../services/alerts.js'

import FormHeading from '../../../components/FormHeading.vue'
import FormRow from '../../../components/FormRow.vue'
import ChangeIndicator from '../../admin/Template/components/ChangeIndicator.vue'

export default {
    name: 'DeviceSettingsEditor',
    components: {
        FormRow,
        FormHeading,
        ChangeIndicator
    },
    props: {
        device: { type: Object, default: null }
    },
    emits: ['device-updated', 'assign-device'],
    setup () {
        const { hasPermission } = usePermissions()

        return { hasPermission }
    },
    data () {
        return {
            editable: {
                settings: {
                    apiMaxLength: ''
                },
                changed: {
                    apiMaxLength: false
                },
                errors: {
                    apiMaxLength: ''
                }
            },
            original: {
                apiMaxLength: '',
                nodeRedVersion: ''
            }
        }
    },
    computed: {
        ...mapState('account', ['features']),
        limitsLauncherEnabled () {
            if (!this.device.agentVersion) {
                // Device has not called home yet - so we don't know what agent
                // version it is running.
                return false
            }
            return semver.gte(this.device.agentVersion, '3.8.3')
        },
        limitAvailable () {
            return true
        },
        unsavedChanges () {
            return this.editable.changed.apiMaxLength
        }
    },
    watch: {
        device: {
            handler () {
                this.getSettings()
            },
            deep: true
        },
        'editable.settings': {
            handler () {
                this.validate()
            },
            deep: true
        }
    },
    mounted () {
        this.getSettings()
    },
    methods: {
        saveSettings : async function () {
            if (!this.validate()){
                return
            }
            const settings = {
                editor: {
                    apiMaxLength: this.editable.settings.apiMaxLength,
                    nodeRedVersion: this.original.nodeRedVersion
                }
            }
            await deviceApi.updateSettings(this.device.id, settings)
            this.$emit('device-updated')
            Alerts.emit('Device settings successfully updated. NOTE: changes will be applied once the device restarts.', 'confirmation', 6000)

        },
        getSettings: async function () {
            if (this.device) {
                const settings = await deviceApi.getSettings(this.device.id)
                this.editable.settings.apiMaxLength = settings.editor?.apiMaxLength || '5mb'
                this.original.apiMaxLength = this.editable.settings.apiMaxLength
                this.original.nodeRedVersion = settings.editor?.nodeRedVersion
                this.editable.changed.apiMaxLength = false
            }
        },
        validate: function () {
            this.editable.changed.apiMaxLength = (this.editable.settings.apiMaxLength !== this.original.apiMaxLength)
            const pattern = /^\d+([km]b)?$/
            if (this.editable.settings.apiMaxLength.length > 0) {
                if (pattern.test(this.editable.settings.apiMaxLength)) {
                    this.editable.errors.apiMaxLength = ''
                    return true
                } else {
                    this.editable.errors.apiMaxLength = 'Invalid Value'
                    return false
                }
            }
            this.editable.errors.apiMaxLength = ''
            return true
        }
    }
}
</script>
