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
                    <CascadingSelector v-if="otc" :node="installTree" />
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
import { markRaw } from 'vue'
import { mapState } from 'vuex'

import deviceApi from '../../../../api/devices.js'

import LinuxIcon from '../../../../assets/icons/linux.svg'
import MacOSIcon from '../../../../assets/icons/macos.svg'
import WindowsIcon from '../../../../assets/icons/windows.svg'

import { CascadingSelector, OptionTileSelector, TabSelector } from '../../../../components/variant-selector/index.js'

import ManualInstall from './components/DeviceCredentialsDialog/ManualInstall.vue'
import NpmInstallContent from './components/DeviceCredentialsDialog/NpmInstallContent.vue'
import ScriptInstallContent from './components/DeviceCredentialsDialog/ScriptInstallContent.vue'

export default {
    name: 'DeviceCredentialsDialog',
    components: {
        CascadingSelector,
        ManualInstall
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
            device: null
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
        },
        installTree () {
            return {
                id: 'root',
                component: markRaw(TabSelector),
                props: { separator: 'or' },
                children: [
                    {
                        id: 'script',
                        component: markRaw(OptionTileSelector),
                        props: { label: 'One-Line Install', title: 'Install & Run Device Agent' },
                        children: [
                            {
                                id: 'windows',
                                component: markRaw(ScriptInstallContent),
                                props: {
                                    label: 'Windows',
                                    icon: WindowsIcon,
                                    title: 'Open an elevated Command Prompt and run:',
                                    command: `powershell -c "irm https://flowfuse.github.io/device-agent/get.ps1|iex" && flowfuse-device-agent-installer.exe -o ${this.otc} -u ${this.settings?.base_url}`
                                }
                            },
                            {
                                id: 'macos',
                                component: markRaw(ScriptInstallContent),
                                props: {
                                    label: 'MacOS',
                                    icon: MacOSIcon,
                                    title: 'Open Terminal and run:',
                                    command: `/bin/bash -c "$(curl -fsSL https://flowfuse.github.io/device-agent/get.sh)" && \\\n./flowfuse-device-agent-installer -o ${this.otc} -u ${this.settings?.base_url}`
                                }
                            },
                            {
                                id: 'linux',
                                component: markRaw(ScriptInstallContent),
                                props: {
                                    label: 'Linux',
                                    icon: LinuxIcon,
                                    title: 'Open Terminal and run:',
                                    command: `/bin/bash -c "$(curl -fsSL https://flowfuse.github.io/device-agent/get.sh)" && \\\n./flowfuse-device-agent-installer -o ${this.otc} -u ${this.settings?.base_url}`
                                }
                            }
                        ]
                    },
                    {
                        id: 'npm',
                        component: markRaw(OptionTileSelector),
                        props: { label: 'Install via NPM', title: 'Install Device Agent' },
                        children: [
                            {
                                id: 'windows',
                                component: markRaw(NpmInstallContent),
                                props: {
                                    label: 'Windows',
                                    icon: WindowsIcon,
                                    installTitle: 'Open Command Prompt or PowerShell as administrator and run:',
                                    installCommand: 'npm install -g @flowfuse/device-agent',
                                    otcCommand: this.otcCommand,
                                    credentials: this.credentials,
                                    device: this.device
                                }
                            },
                            {
                                id: 'macos',
                                component: markRaw(NpmInstallContent),
                                props: {
                                    label: 'MacOS',
                                    icon: MacOSIcon,
                                    installTitle: 'Open Terminal and run:',
                                    installCommand: 'sudo npm install -g @flowfuse/device-agent',
                                    otcCommand: this.otcCommand,
                                    credentials: this.credentials,
                                    device: this.device
                                }
                            },
                            {
                                id: 'linux',
                                component: markRaw(NpmInstallContent),
                                props: {
                                    label: 'Linux',
                                    icon: LinuxIcon,
                                    installTitle: 'Open Terminal and run:',
                                    installCommand: 'sudo npm install -g @flowfuse/device-agent',
                                    otcCommand: this.otcCommand,
                                    credentials: this.credentials,
                                    device: this.device
                                }
                            }
                        ]
                    }
                ]
            }
        }
    }
}
</script>
