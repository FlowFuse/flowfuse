<template>
    <ff-dialog ref="dialog" header="Device Provisioning Configuration">
        <template #default>
            <form class="space-y-6 mt-2">
                <p class="text-sm text-gray-500">
                    To auto provision your devices on the platform, use the following
                    configuration. Make a note of it as this is the only
                    time you will see it.
                </p>
                <pre class="overflow-auto text-sm p-4 border rounded bg-gray-800 text-gray-200">{{ credentials }}</pre>
            </form>
        </template>
        <template #actions>
            <ff-button v-if="!!clipboardSupported" kind="secondary" @click="copy()">Copy to Clipboard</ff-button>
            <ff-button kind="secondary" @click="downloadCredentials()"><template #icon-left><DocumentDownloadIcon /></template>Download device.yml</ff-button>
            <ff-button class="ml-4" @click="close()">Done</ff-button>
        </template>
    </ff-dialog>
</template>

<script>

import { DocumentDownloadIcon } from '@heroicons/vue/outline'
import { mapState } from 'vuex'

import { downloadData } from '../../../../composables/Download.js'
import clipboardMixin from '../../../../mixins/Clipboard.js'
import Alerts from '../../../../services/alerts.js'

export default {
    name: 'ProvisioningCredentialsDialog',
    components: {
        DocumentDownloadIcon
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
        ...mapState('account', ['settings']),
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
