<template>
    <form class="space-y-6">
        <div
            v-if="!securityOptionsSupported"
            class="ff-page-banner my-4"
            data-el="settings-banner-feature-unavailable"
        >
            These options require Device Agent v3.1 or later to take effect.
        </div>
        <TemplateSettingsSecurity
            v-model="editable"
            :editTemplate="false"
            :device="device"
            :team="team"
        />
        <div v-if="hasPermission('device:edit-env')" class="space-x-4 whitespace-nowrap">
            <div v-if="!securityOptionsSupported" class="ff-description italic mb-2">
                These options require Device Agent v3.1 or later to take effect.
            </div>
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

import permissionsMixin from '../../../mixins/Permissions.js'
import Alerts from '../../../services/alerts.js'

import TemplateSettingsSecurity from '../../admin/Template/sections/Security.vue'

export default {
    name: 'DeviceSettingsSecurity',
    components: {
        TemplateSettingsSecurity
    },
    mixins: [permissionsMixin],
    props: {
        device: { type: Object, default: null }
    },
    emits: ['device-updated', 'assign-device'],
    data () {
        return {
            editable: {
                settings: {
                    httpNodeAuth_type: '',
                    httpNodeAuth_user: '',
                    httpNodeAuth_pass: '',
                    localAuth_enabled: false,
                    localAuth_user: '',
                    localAuth_pass: ''
                },
                policy: {
                    httpNodeAuth_type: true,
                    httpNodeAuth_user: true,
                    httpNodeAuth_pass: true,
                    localAuth_enabled: true,
                    localAuth_user: true,
                    localAuth_pass: true
                },
                changed: {
                    settings: {},
                    policy: { }
                },
                errors: {
                    localAuth_user: '',
                    localAuth_pass: ''
                },
                hasErrors: false
            },
            original: {
                httpNodeAuth_type: '',
                httpNodeAuth_user: '',
                httpNodeAuth_pass: '',
                localAuth_enabled: false,
                localAuth_user: '',
                localAuth_pass: ''
            }
        }
    },
    computed: {
        ...mapState('account', ['teamMembership']),
        securityOptionsSupported () {
            if (!this.device.agentVersion) {
                // Device has not called home yet - so we don't know what agent
                // version it is running.
                return false
            }
            return semver.gte(this.device.agentVersion, '3.1.0')
        },
        unsavedChanges () {
            if (this.editable.settings.httpNodeAuth_type !== this.original.httpNodeAuth_type) {
                return true
            }
            if (this.editable.settings.httpNodeAuth_type === 'basic') {
                if (this.editable.settings.httpNodeAuth_user !== this.original.httpNodeAuth_user) {
                    return true
                }
                if (this.editable.settings.httpNodeAuth_pass !== this.original.httpNodeAuth_pass) {
                    return true
                }
            }
            if (this.editable.settings.localAuth_enabled !== this.original.localAuth_enabled) {
                return true
            }
            if (this.editable.settings.localAuth_enabled) {
                if (this.editable.settings.localAuth_user !== this.original.localAuth_user) {
                    return true
                }
                if (this.editable.settings.localAuth_pass !== this.original.localAuth_pass) {
                    return true
                }
            }
            return false
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
        validate: function () {
            this.editable.errors.localAuth_user = ''
            this.editable.errors.localAuth_pass = ''
            this.editable.hasErrors = false
            if (this.editable.settings.localAuth_enabled) {
                if (!this.editable.settings.localAuth_user) {
                    this.editable.errors.localAuth_user = 'Username is required'
                }
                if (!this.editable.settings.localAuth_pass) {
                    this.editable.errors.localAuth_pass = 'Password is required'
                }
            }
            this.editable.hasErrors = !!this.editable.errors.localAuth_user || !!this.editable.errors.localAuth_pass
            return !this.editable.hasErrors
        },
        async updateDevice () {
            await deviceApi.updateDevice(this.device.id, { name: this.input.deviceName })
            this.$emit('device-updated')
        },
        getSettings: async function () {
            if (this.device) {
                const settings = await deviceApi.getSettings(this.device.id)
                this.editable.settings.httpNodeAuth_type = settings.security?.httpNodeAuth?.type || 'none'
                this.editable.settings.httpNodeAuth_user = settings.security?.httpNodeAuth?.user || ''
                this.editable.settings.httpNodeAuth_pass = settings.security?.httpNodeAuth?.pass || ''
                if (this.editable.settings.httpNodeAuth_pass === true) {
                    this.editable.settings.httpNodeAuth_pass = '_PLACEHOLDER_'
                }

                this.original.httpNodeAuth_type = this.editable.settings.httpNodeAuth_type
                this.original.httpNodeAuth_user = this.editable.settings.httpNodeAuth_user
                this.original.httpNodeAuth_pass = this.editable.settings.httpNodeAuth_pass

                this.editable.settings.localAuth_enabled = settings.security?.localAuth?.enabled || false
                this.editable.settings.localAuth_user = settings.security?.localAuth?.user || ''
                this.editable.settings.localAuth_pass = settings.security?.localAuth?.pass || ''
                if (this.editable.settings.localAuth_pass === true) {
                    this.editable.settings.localAuth_pass = '_PLACEHOLDER_'
                }
                this.original.localAuth_enabled = this.editable.settings.localAuth_enabled
                this.original.localAuth_user = this.editable.settings.localAuth_user
                this.original.localAuth_pass = this.editable.settings.localAuth_pass
            }
        },
        saveSettings: async function () {
            if (!this.validate()) {
                // This should never happen, due to error validation markers printed below the fields
                // and the save button _should_ be disabled!  But just in case...
                return
            }
            const settings = { security: { } }
            if (this.editable.settings.httpNodeAuth_type !== 'none') {
                settings.security.httpNodeAuth = {
                    type: this.editable.settings.httpNodeAuth_type
                }
                if (this.editable.settings.httpNodeAuth_type === 'basic') {
                    settings.security.httpNodeAuth.user = this.editable.settings.httpNodeAuth_user
                    if (this.editable.settings.httpNodeAuth_pass !== '_PLACEHOLDER_') {
                        settings.security.httpNodeAuth.pass = this.editable.settings.httpNodeAuth_pass
                    }
                }
            }
            settings.security.localAuth = {
                enabled: !!this.editable.settings.localAuth_enabled
            }
            if (settings.security.localAuth.enabled) {
                settings.security.localAuth.user = this.editable.settings.localAuth_user
                if (this.editable.settings.localAuth_pass !== '_PLACEHOLDER_') {
                    settings.security.localAuth.pass = this.editable.settings.localAuth_pass
                }
            }
            await deviceApi.updateSettings(this.device.id, settings)
            this.$emit('device-updated')
            Alerts.emit('Device settings successfully updated. NOTE: changes will be applied once the device restarts.', 'confirmation', 6000)
        }
    }
}
</script>
