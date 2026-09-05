<template>
    <FormHeading class="mb-6">{{ $t('ui.launcherSettings') }}</FormHeading>
    <form class="space-y-6" data-el="launcher-settings-form">
        <FormRow v-model="input.healthCheckInterval" type="number" :error="errors.healthCheckInterval">
            {{ $t('ui.healthCheckIntervalMs') }}
            <template #description>
                {{ $t('ui.theIntervalAtWhichTheLauncherWillCheckTheHealthO') }}
            </template>
        </FormRow>
        <FormRow v-if="launcherSupportsAutoSafeMode" v-model="input.disableAutoSafeMode" type="checkbox">
            {{ $t('ui.disableAutoSafeMode') }}
            <template #description>
                {{ $t('ui.preventNodeRedFromAutomaticallyEnteringSafeModeW') }}
            </template>
        </FormRow>
        <div v-else class="flex flex-col sm:flex-row">
            <div class="text-gray-800 block text-sm font-medium">
                {{ $t('ui.someSettingsAreNotAvailableUntilYouUpgradeYourSt') }} <ff-button size="small" to="general">{{ $t('ui.upgrade') }}</ff-button>
            </div>
        </div>
    </form>
</template>

<script>

import SemVer from 'semver'
import { useRouter } from 'vue-router'

import InstanceApi from '../../../api/instances.js'
import FormHeading from '../../../components/FormHeading.vue'
import FormRow from '../../../components/FormRow.vue'
import usePermissions from '../../../composables/Permissions.js'
import { t } from '../../../i18n.js'
import Alerts from '../../../services/alerts.js'
import Dialog from '../../../services/dialog.js'

export default {
    name: 'LauncherSettings',
    components: {
        FormRow,
        FormHeading
    },
    inheritAttrs: false,
    props: {
        project: {
            type: Object,
            required: true
        }
    },
    emits: ['instance-updated', 'save-button-state', 'restart-instance'],
    setup () {
        const { hasPermission } = usePermissions()

        return {
            hasPermission
        }
    },
    data () {
        return {
            mounted: false,
            original: {
                healthCheckInterval: null,
                disableAutoSafeMode: null
            },
            input: {
                healthCheckInterval: null,
                disableAutoSafeMode: null
            },
            errors: {
                healthCheckInterval: ''
            }
        }
    },
    computed: {
        unsavedChanges: function () {
            return +this.original.healthCheckInterval !== +this.input.healthCheckInterval ||
                this.original.disableAutoSafeMode !== this.input.disableAutoSafeMode
        },
        launcherSupportsAutoSafeMode: function () {
            const launcherVersion = this.project?.meta?.versions?.launcher
            if (!launcherVersion) {
                // We won't have this for a suspended project - so err on the side
                // of permissive
                return true
            }
            return SemVer.satisfies(SemVer.coerce(launcherVersion), '>=2.12.0')
        },
        saveButton () {
            return {
                visible: true,
                disabled: !this.unsavedChanges || !this.validateFormInputs()
            }
        }
    },
    watch: {
        project: 'getSettings',
        'input.healthCheckInterval': function (value) {
            if (this.mounted) {
                this.validateFormInputs()
            }
        },
        'input.disableAutoSafeMode': function (value) {
            if (this.mounted) {
                this.validateFormInputs()
            }
        },
        saveButton: {
            immediate: true,
            handler (state) {
                this.$emit('save-button-state', state)
            }
        }
    },
    mounted () {
        this.checkAccess()
        this.getSettings()
        this.mounted = true
    },
    methods: {
        checkAccess: function () {
            if (!this.hasPermission('project:edit', { application: this.project.application })) {
                useRouter().push({ replace: true, path: 'general' })
            }
        },
        validateFormInputs () {
            if (!this.unsavedChanges) {
                this.errors.healthCheckInterval = ''
            } else {
                const hci = +this.input.healthCheckInterval
                if (isNaN(hci) || hci < 5000) {
                    this.errors.healthCheckInterval = t('ui.healthCheckIntervalMustBe5000OrGreater')
                } else {
                    this.errors.healthCheckInterval = ''
                }
            }
            return !this.errors.healthCheckInterval
        },
        getSettings: function () {
            this.original.healthCheckInterval = this.project?.launcherSettings?.healthCheckInterval ?? 7500
            this.input.healthCheckInterval = this.project?.launcherSettings?.healthCheckInterval ?? 7500
            this.original.disableAutoSafeMode = this.project?.launcherSettings?.disableAutoSafeMode ?? false
            this.input.disableAutoSafeMode = this.project?.launcherSettings?.disableAutoSafeMode ?? false
        },
        async saveSettings () {
            const launcherSettings = {}
            // only send update if the value has changed
            if (+this.original.healthCheckInterval !== +this.input.healthCheckInterval) {
                launcherSettings.healthCheckInterval = +this.input.healthCheckInterval
            }
            // only send the update if the launcher supports the feature
            if (this.launcherSupportsAutoSafeMode) {
                // only send update if the value has changed
                if (this.original.disableAutoSafeMode !== this.input.disableAutoSafeMode) {
                    launcherSettings.disableAutoSafeMode = this.input.disableAutoSafeMode
                }
            }
            if (!this.validateFormInputs()) {
                Alerts.emit('Please correct the errors before saving.', 'error')
                return
            }
            await InstanceApi.updateInstance(this.project.id, { launcherSettings })
            this.$emit('instance-updated')
            // is instance running
            if (this.project.meta.state === 'running') {
                Dialog.show({
                    header: t('ui.restartRequired'),
                    html: '<p>Instance settings have been successfully updated, but the Instance must be restarted for these settings to take effect.</p><p>Would you like to restart the Instance now?</p>',
                    confirmLabel: 'Restart Now',
                    cancelLabel: 'Restart Later'
                }, () => {
                    // restart the instance
                    this.$emit('restart-instance')
                })
            }
        }
    }
}
</script>
