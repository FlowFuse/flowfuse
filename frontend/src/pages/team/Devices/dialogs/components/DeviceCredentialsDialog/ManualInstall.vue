<template>
    <section>
        <p>
            Place the below configuration on your device.
            See the <a href="https://flowfuse.com/docs/device-agent/" target="_blank">Device Agent documentation</a> for instructions on how to do this.
        </p>
        <pre class="overflow-auto text-xs font-light p-4 my-2 border rounded bg-gray-800 text-gray-200">{{ credentials }}</pre>
        <div class="flex flex-row justify-end space-x-2 -mt-1">
            <ff-button kind="tertiary" size="small" class="ml-4" @click="downloadCredentials()">
                <template #icon-right><DocumentDownloadIcon /></template>
                <span class="">Download</span>
            </ff-button>
            <ff-button kind="tertiary" size="small" @click="copy(credentials)">
                <template #icon-right><ClipboardCopyIcon /></template>
                <span class="">Copy</span>
            </ff-button>
        </div>
    </section>
</template>

<script>
import { ClipboardCopyIcon, DocumentDownloadIcon } from '@heroicons/vue/outline'
import { mapState } from 'pinia'

import { downloadData } from '../../../../../../composables/Download.js'
import clipboardMixin from '../../../../../../mixins/Clipboard.js'
import Alerts from '../../../../../../services/alerts.js'

import { useAccountSettingsStore } from '@/stores/account-settings.js'

export default {
    name: 'ManualInstall',
    components: {
        ClipboardCopyIcon,
        DocumentDownloadIcon
    },
    mixins: [clipboardMixin],
    props: {
        device: {
            type: Object,
            required: true
        }
    },
    computed: {
        ...mapState(useAccountSettingsStore, ['settings']),
        credentials () {
            let result = `deviceId: ${this.device.id}
token: ${this.device.credentials.token}
credentialSecret: ${this.device.credentials.credentialSecret}
forgeURL: ${this.settings?.base_url}
`
            if (this.device.credentials.broker) {
                result += `brokerURL: ${this.device.credentials.broker.url}
brokerUsername: ${this.device.credentials.broker.username}
brokerPassword: ${this.device.credentials.broker.password}
`
            }
            return result
        }
    },
    methods: {
        copy (text) {
            this.copyToClipboard(text).then(() => {
                Alerts.emit('Copied to Clipboard.', 'confirmation')
            }).catch((err) => {
                console.warn('Clipboard write permission denied: ', err)
                Alerts.emit('Clipboard write permission denied.', 'warning')
            })
        },
        downloadCredentials () {
            downloadData(this.credentials, `device-${this.device.id}.yml`)
        }
    }
}
</script>

<style scoped lang="scss">

</style>
