<template>
    <ff-dialog ref="dialog" header="Device Configuration">
        <template #default>
            <form class="text-gray-800">
                <template v-if="!hasCredentials">
                    <p>
                        Are you sure you want to regenerate configuration for this device?
                    </p>
                    <p class="mt-3 mb-6">
                        The existing configuration will be reset and the device will not
                        be able to reconnect until it has been given its new configuration.
                    </p>
                </template>
                <template v-if="hasCredentials">
                    <template v-if="otc">
                        <p>
                            With the <a href="https://flowfuse.com/docs/device-agent/" target="_blank">FlowFuse Device Agent</a> installed on your device, run the following command to setup its connection to the platform:
                        </p>
                        <pre class="overflow-auto text-xs font-light p-4 my-2 border rounded bg-gray-800 text-gray-200">{{ otcCommand }}</pre>
                        <div class="flex flex-row justify-end space-x-2 -mt-1">
                            <ff-button kind="tertiary" size="small" @click="copy(otcCommand)">
                                <template #icon-right><ClipboardCopyIcon /></template>
                                <span class="">Copy</span>
                            </ff-button>
                        </div>
                        <p class="text-gray-600 italic text-sm -mt-6">
                            <span>Notes:</span>
                            <ul class="list-disc list-inside ml-2">
                                <li>this command is single use and expires in 24h.</li>
                                <li>requires device-agent v2.1 or later (follow the manual setup below for older versions).</li>
                            </ul>
                        </p>

                        <details class="mt-4">
                            <summary class="mt-6">Show manual setup instructions</summary>
                            <p class="mt-4">
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
                        </details>
                    </template>
                    <template v-else>
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
                    </template>
                </template>
            </form>
        </template>
        <template #actions>
            <template v-if="!hasCredentials">
                <ff-button kind="secondary" @click="close()">Cancel</ff-button>
                <ff-button kind="danger" class="ml-4" @click="regenerateCredentials()">Regenerate configuration</ff-button>
            </template>
            <template v-else>
                <ff-button class="ml-4" @click="close()">Done</ff-button>
            </template>
        </template>
    </ff-dialog>
</template>

<script>
// import devicesApi from '../../../../api/devices'
import { ClipboardCopyIcon, DocumentDownloadIcon } from '@heroicons/vue/outline'
import { mapState } from 'vuex'

import deviceApi from '../../../../api/devices.js'
import clipboardMixin from '../../../../mixins/Clipboard.js'
import Alerts from '../../../../services/alerts.js'

export default {
    name: 'DeviceCredentialsDialog',
    components: {
        ClipboardCopyIcon,
        DocumentDownloadIcon
    },
    mixins: [clipboardMixin],
    props: ['team'],
    data () {
        return {
            device: null
        }
    },
    methods: {
        downloadCredentials () {
            const element = document.createElement('a')
            element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(this.credentials))
            element.setAttribute('download', `device-${this.device.id}.yml`)
            element.style.display = 'none'
            document.body.appendChild(element)
            element.click()
            document.body.removeChild(element)
        },
        async regenerateCredentials () {
            const creds = await deviceApi.generateCredentials(this.device.id)
            this.device.credentials = creds
        },
        close () {
            this.$refs.dialog.close()
            this.device.credentials = undefined
        },
        copy (text) {
            this.copyToClipboard(text).then(() => {
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
            return this.device && this.device.credentials
        },
        otc: function () {
            return this.device?.credentials?.otc
        },
        otcCommand: function () {
            return `flowfuse-device-agent -o ${this.otc} -u ${this.settings.base_url}`
        },
        credentials: function () {
            let result = ''
            if (this.device) {
                result = `deviceId: ${this.device.id}
token: ${this.device.credentials.token}
credentialSecret: ${this.device.credentials.credentialSecret}
forgeURL: ${this.settings.base_url}
`
                if (this.device.credentials.broker) {
                    result += `brokerURL: ${this.device.credentials.broker.url}
brokerUsername: ${this.device.credentials.broker.username}
brokerPassword: ${this.device.credentials.broker.password}
`
                }
            }
            return result
        }
    },
    setup () {
        return {
            show (device) {
                this.$refs.dialog.show()
                this.device = device
            }
        }
    }
}
</script>
