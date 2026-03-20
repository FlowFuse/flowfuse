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
                    <ManualInstall v-else :device="device" />
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

import ManualInstall from './components/DeviceCredentialsDialog/ManualInstall.vue'
import NpmInstallContent from './components/DeviceCredentialsDialog/NpmInstallContent.vue'
import ScriptInstallContent from './components/DeviceCredentialsDialog/ScriptInstallContent.vue'

import deviceApi from '@/api/devices.js'

import LinuxIcon from '@/assets/icons/linux.svg'
import MacOSIcon from '@/assets/icons/macos.svg'
import WindowsIcon from '@/assets/icons/windows.svg'

import { CascadingSelector, OptionTileSelector, TabSelector } from '@/components/variant-selector/index.js'

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
        hasCredentials () {
            return this.device && this.device.credentials
        },
        otc () {
            return this.device?.credentials?.otc
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
                            { id: 'windows', component: markRaw(ScriptInstallContent), props: { label: 'Windows', icon: WindowsIcon, device: this.device, os: 'windows' } },
                            { id: 'macos', component: markRaw(ScriptInstallContent), props: { label: 'MacOS', icon: MacOSIcon, device: this.device, os: 'macos' } },
                            { id: 'linux', component: markRaw(ScriptInstallContent), props: { label: 'Linux', icon: LinuxIcon, device: this.device, os: 'linux' } }
                        ]
                    },
                    {
                        id: 'npm',
                        component: markRaw(OptionTileSelector),
                        props: { label: 'Install via NPM', title: 'Install Device Agent' },
                        children: [
                            { id: 'windows', component: markRaw(NpmInstallContent), props: { label: 'Windows', icon: WindowsIcon, device: this.device, os: 'windows' } },
                            { id: 'macos', component: markRaw(NpmInstallContent), props: { label: 'MacOS', icon: MacOSIcon, device: this.device, os: 'macos' } },
                            { id: 'linux', component: markRaw(NpmInstallContent), props: { label: 'Linux', icon: LinuxIcon, device: this.device, os: 'linux' } }
                        ]
                    }
                ]
            }
        }
    }
}
</script>
