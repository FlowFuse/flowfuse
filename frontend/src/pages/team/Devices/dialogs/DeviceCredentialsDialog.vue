<template>
    <ff-dialog ref="dialog" :header="`Device Agent Configuration - ${device?.name}`" data-el="team-device-config-dialog">
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
                <template v-else>
                    <template v-if="otc">
                        <label class="block font-bold mb-2">Install Device Agent</label>
                        <div class="mb-4">
                            <ul class="grid grid-cols-3 space-x-2">
                                <li
                                    v-for="os in ['Windows', 'MacOS', 'Linux']"
                                    :key="os"
                                    class="p-4 mb-2 border rounded bg-white border-gray-200 cursor-pointer flex items-center justify-center space-x-2"
                                    :class="{ 'border-blue-600': selectedOS === os }"
                                    @click.stop="selectedOS = os"
                                >
                                    <img :src="osIcons[os]" class="w-5 h-5" :alt="os + ' icon'">
                                    <span>{{ os }}</span>
                                </li>
                            </ul>
                            <div class="grid grid-cols-1 gap-4">
                                <div class="p-2 border rounded bg-gray-50">
                                    <template v-if="selectedOS === 'Windows'">
                                        <p>Open Command Prompt or PowerShell as administrator and run:</p>
                                        <pre class="overflow-auto text-xs font-light p-4 my-2 border rounded bg-gray-800 text-gray-200">npm install -g @flowfuse/device-agent</pre>
                                        <div class="flex flex-row justify-end space-x-2 -mt-1">
                                            <ff-button kind="tertiary" size="small" @click="copy('npm install -g @flowfuse/device-agent')">
                                                <template #icon-right><ClipboardCopyIcon /></template>
                                                <span class="">Copy</span>
                                            </ff-button>
                                        </div>
                                    </template>
                                    <template v-if="selectedOS === 'MacOS'">
                                        <p>Open Terminal and run:</p>
                                        <pre class="overflow-auto text-xs font-light p-4 my-2 border rounded bg-gray-800 text-gray-200">sudo npm install -g @flowfuse/device-agent</pre>
                                        <div class="flex flex-row justify-end space-x-2 -mt-1">
                                            <ff-button kind="tertiary" size="small" @click="copy('sudo npm install -g @flowfuse/device-agent')">
                                                <template #icon-right><ClipboardCopyIcon /></template>
                                                <span class="">Copy</span>
                                            </ff-button>
                                        </div>
                                    </template>
                                    <template v-if="selectedOS === 'Linux'">
                                        <p>Open Terminal and run:</p>
                                        <pre class="overflow-auto text-xs font-light p-4 my-2 border rounded bg-gray-800 text-gray-200">sudo npm install -g @flowfuse/device-agent</pre>
                                        <div class="flex flex-row justify-end space-x-2 -mt-1">
                                            <ff-button kind="tertiary" size="small" @click="copy('sudo npm install -g @flowfuse/device-agent')">
                                                <template #icon-right><ClipboardCopyIcon /></template>
                                                <span class="">Copy</span>
                                            </ff-button>
                                        </div>
                                    </template>
                                </div>
                            </div>
                        </div>
                        <p class="text-gray-600 italic text-sm">
                            Note: For more detailed instructions on installing the Device Agent, checkout the documentation <a href="https://flowfuse.com/docs/device-agent/" target="_blank">here</a>.
                        </p>
                        <label class="block font-bold mt-4 mb-2">Connect Agent to FlowFuse</label>
                        <p class="mt-2">
                            Then, with the Device Agent installed, run the following command, on your hardware, to connect it to FlowFuse:
                        </p>
                        <pre class="overflow-auto text-xs font-light p-4 my-2 border rounded bg-gray-800 text-gray-200">{{ otcCommand }}</pre>
                        <div class="flex flex-row justify-end space-x-2 -mt-1">
                            <ff-button kind="tertiary" size="small" @click="copy(otcCommand)">
                                <template #icon-right><ClipboardCopyIcon /></template>
                                <span class="">Copy</span>
                            </ff-button>
                        </div>
                        <p class="text-gray-600 italic text-sm">
                            <span>Notes:</span>
                            <ul class="list-disc list-inside ml-2">
                                <li>this command is single use and expires in 24h.</li>
                                <li>requires device-agent v2.1 or later (follow the manual setup below for older versions).</li>
                            </ul>
                        </p>

                        <details class="mt-4">
                            <summary class="mt-6 cursor-pointer">Show manual setup instructions</summary>
                            <ManualInstall class="mt-4" :credentials="credentials" :device="device" />
                        </details>
                    </template>

                    <ManualInstall v-else :credentials="credentials" :device="device" />
                </template>
            </form>
        </template>
        <template #actions>
            <template v-if="!hasCredentials">
                <ff-button kind="secondary" @click="close">Cancel</ff-button>
                <ff-button kind="danger" class="ml-4" @click="regenerateCredentials()">Regenerate configuration</ff-button>
            </template>
            <template v-else>
                <ff-button class="ml-4" @click="close">Done</ff-button>
            </template>
        </template>
    </ff-dialog>
</template>

<script>
import { ClipboardCopyIcon } from '@heroicons/vue/outline'
import { mapState } from 'vuex'

import deviceApi from '../../../../api/devices.js'
import LinuxIcon from '../../../../assets/icons/linux.svg'
import MacOSIcon from '../../../../assets/icons/macos.svg'
import WindowsIcon from '../../../../assets/icons/windows.svg'
import clipboardMixin from '../../../../mixins/Clipboard.js'
import Alerts from '../../../../services/alerts.js'

import ManualInstall from './components/DeviceCredentialsDialog/ManualInstall.vue'

export default {
    name: 'DeviceCredentialsDialog',
    components: {
        ManualInstall,
        ClipboardCopyIcon
    },
    mixins: [clipboardMixin],
    props: ['team'],
    data () {
        return {
            device: null,
            selectedOS: 'Windows', // Default selected OS
            osIcons: {
                Windows: WindowsIcon,
                MacOS: MacOSIcon,
                Linux: LinuxIcon
            }
        }
    },
    methods: {
        async regenerateCredentials () {
            const creds = await deviceApi.generateCredentials(this.device.id)
            this.device.credentials = creds
        },
        close (event) {
            if (event.custom) return // Ignore synthetic Shepherd events

            this.$refs.dialog.close()
            this.device.credentials = undefined

            // Re-dispatch the click event for Shepherd
            const newEvent = new Event('click', { bubbles: false, cancelable: true })
            newEvent.custom = true
            event.target.dispatchEvent(newEvent)
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
                this.device = device
                this.$refs.dialog.show()
            }
        }
    }
}
</script>
