<template>
    <ff-dialog ref="dialog" :header="$t('ui.remoteInstanceProvisioningConfiguration')">
        <template #default>
            <form class="space-y-6 mt-2">
                <p class="text-sm text-gray-500">
                    {{ $t('ui.toAutoProvisionYourRemoteInstanceOnThePlatformUs') }}
                </p>
                <pre class="overflow-auto text-sm p-4 border rounded-sm ff-code-surface">{{ credentials }}</pre>
            </form>
        </template>
        <template #actions>
            <ff-button v-if="!!clipboardSupported" kind="secondary" @click="copy()">{{ $t('ui.copyToClipboard') }}</ff-button>
            <ff-button kind="secondary" @click="downloadCredentials()"><template #icon-left><DocumentArrowDownIcon /></template>{{ $t('ui.downloadDeviceYml') }}</ff-button>
            <ff-button class="ml-4" @click="close()">{{ $t('ui.done') }}</ff-button>
        </template>
    </ff-dialog>
</template>

<script>

import { DocumentArrowDownIcon } from '@heroicons/vue/24/outline'
import { mapState } from 'pinia'

import { downloadData } from '../../../../composables/Download.js'
import clipboardMixin from '../../../../mixins/Clipboard.js'
import Alerts from '../../../../services/alerts.js'

import { useAccountSettingsStore } from '@/stores/account-settings.js'

export default {
    name: 'ProvisioningCredentialsDialog',
    components: {
        DocumentArrowDownIcon
    },
    mixins: [clipboardMixin],
    props: ['team'],
    data () {
        return {
            token: null
        }
    },
    methods: {
        downloadCredentials () {
            downloadData(this.credentials, 'device.yml')
        },
        close () {
            this.$refs.dialog.close()
            this.token = undefined
        },
        copy () {
            this.copyToClipboard(this.credentials).then(() => {
                Alerts.emit('Copied to Clipboard.', 'confirmation')
            }).catch((err) => {
                console.warn('Clipboard write permission denied: ', err)
                Alerts.emit('Clipboard write permission denied.', 'warning')
            })
        }
    },
    computed: {
        ...mapState(useAccountSettingsStore, ['settings']),
        hasCredentials: function () {
            return !!this.token?.token
        },
        credentials: function () {
            const result = ['### PROVISIONING TOKEN ###']
            if (this.token) {
                if (this.token.name) {
                    result.push(`provisioningName: ${this.token.name}`)
                }
                result.push(`provisioningTeam: ${this.token.team}`)
                result.push(`provisioningToken: ${this.token.token}`)
            }
            result.push(`forgeURL: ${this.settings.base_url}`)
            return result.join('\n')
        }
    },
    setup () {
        return {
            show (token) {
                this.token = token
                this.$refs.dialog.show()
            }
        }
    }
}
</script>
