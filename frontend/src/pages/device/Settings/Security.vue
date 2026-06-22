<template>
    <form class="space-y-6" data-el="device-security">
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
        <div v-if="!!settings.features.httpBearerTokens && editable.settings.httpNodeAuth_type === 'flowforge-user'">
            <FormHeading>HTTP Node Bearer Tokens</FormHeading>
            <div v-if="hasTeamLevelTokenPermission">
                <div v-if="deviceSupportsTokens">
                    <ff-data-table
                        data-el="tokens-table"
                        :rows="tokens" :columns="columns" :show-search="true" search-placeholder="Search Tokens..."
                        :show-load-more="false"
                    >
                        <template #actions>
                            <ff-button data-action="new-token" @click="newToken()">
                                <template #icon-left>
                                    <PlusSmallIcon />
                                </template>
                                Add Token
                            </ff-button>
                        </template>
                        <template #context-menu="{row}">
                            <ff-kebab-item data-action="edit-token" label="Edit" @click="editToken(row)" />
                            <ff-kebab-item data-action="delete-token" label="Delete" @click="deleteToken(row)" />
                        </template>
                        <template v-if="tokens.length === 0" #table>
                            <div class="ff-no-data ff-no-data-large">
                                You don't have any tokens yet
                            </div>
                        </template>
                    </ff-data-table>
                </div>
                <div v-else class="ff-description italic mb-2">
                    HTTP Token support requires Device Agent v4.0 or later.
                </div>
            </div>
        </div>

        <div v-if="hasPermission('device:edit-env')" class="space-x-4 whitespace-nowrap">
            <div v-if="!securityOptionsSupported" class="ff-description italic mb-2">
                These options require Device Agent v3.1 or later.
            </div>
            <ff-button data-el="submit" size="small" :disabled="!unsavedChanges || editable.hasErrors" @click="saveSettings()">
                Save Settings
            </ff-button>
        </div>
    </form>
    <TokenDialog ref="tokenDialog" data-el="http-token-diag" :device="device" @token-created="newTokenDone" @token-updated="getTokens" />
    <TokenCreated ref="tokenCreated" />
</template>

<script>
import { PlusSmallIcon } from '@heroicons/vue/24/outline'

import { mapState } from 'pinia'
import semver from 'semver'
import { markRaw } from 'vue'

import deviceApi from '../../../api/devices.js'
import FormHeading from '../../../components/FormHeading.vue'
import usePermissions from '../../../composables/Permissions.js'

import Alerts from '../../../services/alerts.js'
import TokenCreated from '../../account/Security/dialogs/TokenCreated.vue'

import ExpiryCell from '../../account/components/ExpiryCell.vue'

import TemplateSettingsSecurity from '../../admin/Template/sections/Security.vue'

import TokenDialog from './dialogs/TokenDialog.vue'

import { useAccountSettingsStore } from '@/stores/account-settings.js'
import { useContextStore } from '@/stores/context.js'

export default {
    name: 'DeviceSettingsSecurity',
    components: {
        FormHeading,
        PlusSmallIcon,
        TemplateSettingsSecurity,
        TokenDialog,
        TokenCreated
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
            },
            tokens: [],
            columns: [
                { label: 'Name', key: 'name', sortable: true },
                // { label: 'Scope', key: 'scope' },
                {
                    label: 'Expires',
                    key: 'expiresAt',
                    component: {
                        is: markRaw(ExpiryCell)
                    }
                }
            ]
        }
    },
    computed: {
        ...mapState(useAccountSettingsStore, ['featuresCheck', 'settings']),
        ...mapState(useContextStore, ['team']),
        securityOptionsSupported () {
            if (!this.device.agentVersion) {
                // Device has not called home yet - so we don't know what agent
                // version it is running.
                return false
            }
            return semver.gte(this.device.agentVersion, '3.1.0')
        },
        hasTeamLevelTokenPermission () {
            // The server checks device:edit at the team level (not application level),
            // so we must match that here to avoid silent 403s
            return this.hasPermission('device:edit')
        },
        deviceSupportsTokens () {
            if (!this.device.agentVersion) {
                return false
            }
            // return true
            return semver.gte(this.device.agentVersion, '4.0.0')
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
        },
        'editable.settings.httpNodeAuth_type': {
            handler (v) {
                if (v === 'flowforge-user' && this.hasTeamLevelTokenPermission) {
                    this.getTokens()
                }
            }
        }
    },
    mounted () {
        if (!this.hasPermission('device:edit', { application: this.device.application })) {
            return this.$router.replace({ name: 'device-settings' })
        }

        this.getSettings()
        if (this.featuresCheck.isHTTPBearerTokensFeatureEnabled && this.hasTeamLevelTokenPermission) {
            this.getTokens()
        }
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
        },
        async getTokens () {
            const response = await deviceApi.getHTTPTokens(this.device.id)
            this.tokens = response.tokens
        },
        newToken () {
            this.$refs.tokenDialog.showCreate()
        },
        newTokenDone (token) {
            this.$refs.tokenCreated.showToken(token)
            this.getTokens()
        },
        editToken (row) {
            this.$refs.tokenDialog.showEdit(row)
        },
        deleteToken: async function (row) {
            await deviceApi.deleteHTTPToken(this.device.id, row.id)
            this.getTokens()
        }
    }
}
</script>
