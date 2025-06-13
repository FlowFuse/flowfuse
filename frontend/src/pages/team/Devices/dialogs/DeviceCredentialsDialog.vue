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
                    <InstallationMethodSelector
                        :selected-method="installationMethod"
                        :installation-methods="installationMethods"
                        @select-method="installationMethod = $event"
                    />

                    <OtcInstallSection
                        v-if="otc"
                        :selected-o-s="selectedOS"
                        :otc-command="otcCommand"
                        :installation-method="installationMethod"
                        :device="device"
                        :credentials="credentials"
                        @select-os="selectedOS = $event"
                    />

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
import { mapState } from 'vuex'

import deviceApi from '../../../../api/devices.js'

import InstallationMethodSelector from './components/DeviceCredentialsDialog/InstallationMethodSelector.vue'

import ManualInstall from './components/DeviceCredentialsDialog/ManualInstall.vue'
import OtcInstallSection from './components/DeviceCredentialsDialog/OtcInstallSection.vue'

export default {
    name: 'DeviceCredentialsDialog',
    components: {
        InstallationMethodSelector,
        ManualInstall,
        OtcInstallSection
    },
    props: ['team'],
    setup () {
        return {
            show (device) {
                this.device = device
                this.$refs.dialog.show()
            }
        }
    },
    data () {
        return {
            device: null,
            selectedOS: 'Windows', // Default selected OS,
            installationMethod: 'script',
            installationMethods: [
                {
                    slug: 'script',
                    label: 'Install via Script'
                },
                {
                    slug: 'npm',
                    label: 'Install via NPM'
                }
            ]
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
    }
}
</script>
