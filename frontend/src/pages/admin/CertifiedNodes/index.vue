<template>
    <ff-page>
        <template #header>
            <ff-page-header :title="$t('ui.flowfuseNodes')" :tabs="sideNavigation" />
        </template>
        <div class="grow">
            <ff-loading v-if="loading" :message="$t('ui.savingSettings')" />
            <FormRow v-model="input.registryToken" type="password" :label="'FlowFuse Registry Token'">
                {{ $t('ui.accessTokenForTheFlowfuseNpmRegistry') }}
                <template #description>
                    {{ $t('ui.accessToCertifiedNodesOrFlowfuseExclusiveNodesRe') }} <a target="_blank" class="underline" href="https://flowfuse.com/support">{{ $t('ui.flowfuseSupport') }}</a>.
                </template>
            </FormRow>
            <div class="pt-8">
                <ff-button :disabled="!saveEnabled" data-action="save-settings" @click="saveChanges">{{ $t('ui.saveSettings2') }}</ff-button>
            </div>
        </div>
    </ff-page>
</template>

<script>
import { mapActions, mapState } from 'pinia'

import settingsApi from '../../../api/settings.js'
import FormRow from '../../../components/FormRow.vue'
import Alerts from '../../../services/alerts.js'

import { useAccountSettingsStore } from '@/stores/account-settings.js'

export default {
    name: 'AdminCertifiedNodes',
    components: {
        FormRow
    },
    data () {
        return {
            placeholderToken: '********',
            loading: false,
            input: {
                registryToken: ''
            },
            errors: {
                'platform:ff-npm-registry:token': ''
            }
        }
    },
    computed: {
        ...mapState(useAccountSettingsStore, ['settings']),
        sideNavigation () {
            return []
        },
        saveEnabled () {
            if (this.settings['platform:ff-npm-registry:enabled']) {
                return this.input.registryToken !== this.placeholderToken
            }
            return this.input.registryToken !== ''
        }
    },
    created () {
        if (this.settings['platform:ff-npm-registry:enabled']) {
            this.input.registryToken = this.placeholderToken
        }
    },
    methods: {
        ...mapActions(useAccountSettingsStore, ['refreshSettings']),
        async saveChanges () {
            this.loading = true
            const options = {
                'platform:ff-npm-registry:token': this.input.registryToken
            }
            settingsApi.updateSettings(options)
                .then(async () => {
                    await this.refreshSettings()
                    if (this.settings['platform:ff-npm-registry:enabled']) {
                        // Set the placeholder to the same length as the just-saved token, so
                        // it doesn't change
                        this.placeholderToken = this.input.registryToken
                    }
                    Alerts.emit('Settings changed successfully.', 'confirmation')
                })
                .catch(async (err) => {
                    console.error(err)
                    Alerts.emit(`Something went wrong: ${err}`, 'warning')
                })
                .finally(() => {
                    this.loading = false
                })
        }
    }
}
</script>
