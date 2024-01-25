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
                    <p>
                        To connect your device to the platform, use the following
                        configuration. This will need to be placed on your device.
                    </p>
                    <p class="mt-4">
                        See the
                        <a
                            href="https://flowfuse.com/docs/device-agent/register/#connect-the-device" target="_blank"
                            rel="noreferrer"
                        >Connect Your Device</a> documentation for more information.
                    </p>

                    <p class="font-bold mt-4"><i>Make a note of this configuration, as this is the only time you will see it.</i></p>
                    <pre class="overflow-auto text-sm p-4 my-2 border rounded bg-gray-800 text-gray-200">{{ credentials }}</pre>

                    <template v-if="otc">
                        <p class="mt-6">
                            Alternatively, you can use the following Quick Connect command:
                        </p>
                        <pre class="overflow-auto text-xs font-light p-4 mt-2 border rounded bg-gray-800 text-gray-200">{{ otcCommand }}</pre>
                        <p class="text-gray-600 italic text-xs">Note: the Quick Connect command is single use, expires in 24h and requires device-agent v2.1 or later.</p>
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
                <ff-button v-if="clipboardSupported && !otc" kind="secondary" @click="copy(credentials)">Copy to Clipboard</ff-button>
                <DropdownMenu v-if="clipboardSupported && otc" buttonClass="ff-btn ff-btn--secondary" :options="copyButtonOptions">
                    Copy to Clipboard
                </DropdownMenu>
                <ff-button kind="secondary" @click="downloadCredentials()">
                    <template #icon-left><DocumentDownloadIcon /></template>
                    <span class="mr-2 whitespace-nowrap">Download device-{{ device.id }}.yml</span>
                </ff-button>
                <ff-button class="ml-4" @click="close()">Done</ff-button>
            </template>
        </template>
    </ff-dialog>
</template>

<script>
// import devicesApi from '../../../../api/devices'
import { DocumentDownloadIcon } from '@heroicons/vue/outline'
import { mapState } from 'vuex'

import deviceApi from '../../../../api/devices.js'
import DropdownMenu from '../../../../components/DropdownMenu.vue'
import clipboardMixin from '../../../../mixins/Clipboard.js'
import Alerts from '../../../../services/alerts.js'

export default {
    name: 'DeviceCredentialsDialog',
    components: {
        DocumentDownloadIcon,
        DropdownMenu
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
            return `flowfuse-device-agent --qc -o ${this.otc} -u ${this.settings.base_url}`
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
        },
        copyButtonOptions: function () {
            const result = [
                { name: 'Device Configuration', action: () => this.copy(this.credentials), disabled: false }
            ]
            if (this.otc) {
                result.push({ name: 'Quick Connect command', action: () => this.copy(this.otcCommand), disabled: false })
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
