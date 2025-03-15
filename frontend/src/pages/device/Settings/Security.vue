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
            :team="team"
        />
        <div v-if="hasPermission('device:edit-env')" class="space-x-4 whitespace-nowrap">
            <div v-if="!securityOptionsSupported" class="ff-description italic mb-2">
                These options require Device Agent v3.1 or later to take effect.
            </div>
            <ff-button data-el="submit" size="small" :disabled="!unsavedChanges" @click="saveSettings()">
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
                    httpNodeAuth_pass: ''
                },
                policy: {
                    httpNodeAuth_type: true,
                    httpNodeAuth_user: true,
                    httpNodeAuth_pass: true
                },
                changed: {
                    settings: {},
                    policy: { }
                },
                errors: {}
            },
            original: {
                httpNodeAuth_type: '',
                httpNodeAuth_user: '',
                httpNodeAuth_pass: ''
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
            return false
        }
    },
    watch: {
        device: {
            handler () {
                this.getSettings()
            },
            deep: true
        }
    },
    mounted () {
        this.getSettings()
    },
    methods: {
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
            }
        },
        saveSettings: async function () {
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
            await deviceApi.updateSettings(this.device.id, settings)
            this.$emit('device-updated')
            Alerts.emit('Device settings successfully updated. NOTE: changes will be applied once the device restarts.', 'confirmation', 6000)
        }
    }
}
</script>
