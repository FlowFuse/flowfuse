<template>
    <form class="space-y-6" data-el="instance-editor" @submit.prevent>
        <FormHeading>{{ $t('ui.limits') }}</FormHeading>
        <div v-if="limitAvailable">
            <div v-if="limitsLauncherEnabled" class="flex flex-col sm:flex-row">
                <div class="w-full max-w-md sm:mr-8">
                    <FormRow v-model="editable.settings.apiMaxLength" :error="editable.errors.apiMaxLength" type="text">
                        {{ $t('ui.maxHttpPayloadSize') }}
                        <template #description>
                            {{ $t('ui.theMaximumNumberOfBytesAllowedInAHttpRequestInBy') }}
                        </template>
                        <template #append><ChangeIndicator :value="editable.changed.apiMaxLength" /></template>
                    </FormRow>
                </div>
            </div>
            <notice-banner v-else :title="$t('ui.upgradeRequired')">
                <p>
                    {{ $t('ui.please') }} <a target="_blank" class="ff-link" href="https://flowfuse.com/docs/device-agent/install/device-agent-installer/#device-agent">{{ $t('ui.upgrade2') }}</a> {{ $t('ui.yourDeviceAgentToV383ToBeAbleToSetApimaxlength') }}
                </p>
            </notice-banner>
        </div>
        <FeatureUnavailableToTeam v-if="!limitAvailable" :featureName="$t('ui.setApiSizeLimits')" />
        <div v-if="hasPermission('device:edit-env')" class="space-x-4 whitespace-nowrap">
            <ff-button data-el="submit" size="small" :disabled="!unsavedChanges || editable.hasErrors" @click="saveSettings()">
                {{ $t('ui.saveSettings') }}
            </ff-button>
        </div>
    </form>
</template>

<script>

import { mapState } from 'pinia'
import semver from 'semver'

import deviceApi from '../../../api/devices.js'
import FormHeading from '../../../components/FormHeading.vue'
import FormRow from '../../../components/FormRow.vue'
import FeatureUnavailableToTeam from '../../../components/banners/FeatureUnavailableToTeam.vue'
import NoticeBanner from '../../../components/notices/NoticeBanner.vue'
import usePermissions from '../../../composables/Permissions.js'

import { t } from '../../../i18n.js'
import Alerts from '../../../services/alerts.js'

import ChangeIndicator from '../../admin/Template/components/ChangeIndicator.vue'

import { useAccountSettingsStore } from '@/stores/account-settings.js'
import { useContextStore } from '@/stores/context.js'

export default {
    name: 'DeviceSettingsEditor',
    components: {
        NoticeBanner,
        FeatureUnavailableToTeam,
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
                },
                hasErrors: false
            },
            original: {
                apiMaxLength: '',
                nodeRedVersion: ''
            }
        }
    },
    computed: {
        ...mapState(useContextStore, ['team']),
        ...mapState(useAccountSettingsStore, ['features']),
        limitsLauncherEnabled () {
            if (!this.device.agentVersion) {
                // Device has not called home yet - so we don't know what agent
                // version it is running, so assume it will be new version
                return true
            }
            return semver.gte(this.device.agentVersion, '3.8.3')
        },
        limitAvailable () {
            const flag = this.features.editorLimits && this.team.type.properties.features?.editorLimits
            return !!flag
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
        saveSettings: async function () {
            if (!this.validate()) {
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
                } else {
                    this.editable.errors.apiMaxLength = t('ui.invalidValue')
                }
            } else {
                this.editable.errors.apiMaxLength = ''
            }
            this.editable.hasErrors = !!this.editable.errors.apiMaxLength
            return !this.editable.hasErrors
        }
    }
}
</script>
