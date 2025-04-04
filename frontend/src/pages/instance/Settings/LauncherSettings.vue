<template>
    <FormHeading class="mb-6">Launcher Settings</FormHeading>
    <form class="space-y-6" data-el="launcher-settings-form">
        <FormRow v-model="input.healthCheckInterval" type="number" :error="errors.healthCheckInterval">
            Health check interval (ms)
            <template #description>
                The interval at which the launcher will check the health of Node-RED.
                Flows that perform CPU intensive work may need to increase this from the default of 7500ms.
            </template>
        </FormRow>
        <FormRow v-if="launcherSupportsAutoSafeMode" v-model="input.disableAutoSafeMode" type="checkbox">
            Disable Auto Safe Mode
            <template #description>
                Prevent Node-RED from automatically entering safe mode when a crash loop is detected.
                WARNING: Disabling Auto Safe Mode is not recommended. A problem that causes Node-RED to crash multiple successive times may result in a contineous bootloop that will need to be manually resolved.
            </template>
        </FormRow>
        <div v-else class="flex flex-col sm:flex-row">
            <div class="text-gray-800 block text-sm font-medium">
                Some settings are not available until you upgrade your stack. <ff-button size="small" to="general">Upgrade</ff-button>
            </div>
        </div>
    </form>
</template>

<script>

import SemVer from 'semver'
import { useRouter } from 'vue-router'

import { mapState } from 'vuex'

import InstanceApi from '../../../api/instances.js'
import FormHeading from '../../../components/FormHeading.vue'
import FormRow from '../../../components/FormRow.vue'
import permissionsMixin from '../../../mixins/Permissions.js'
import Alerts from '../../../services/alerts.js'
import Dialog from '../../../services/dialog.js'

export default {
    name: 'LauncherSettings',
    components: {
        FormRow,
        FormHeading
    },
    mixins: [permissionsMixin],
    inheritAttrs: false,
    props: {
        project: {
            type: Object,
            required: true
        }
    },
    emits: ['instance-updated', 'save-button-state', 'restart-instance'],
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
        ...mapState('account', ['team', 'teamMembership']),
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
            if (!this.hasPermission('project:edit')) {
                useRouter().push({ replace: true, path: 'general' })
            }
        },
        validateFormInputs () {
            if (!this.unsavedChanges) {
                this.errors.healthCheckInterval = ''
            } else {
                const hci = +this.input.healthCheckInterval
                if (isNaN(hci) || hci < 5000) {
                    this.errors.healthCheckInterval = 'Health check interval must be 5000 or greater'
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
                    header: 'Restart Required',
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
