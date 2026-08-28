<template>
    <ff-dialog ref="dialog" :header="`Device Agent Configuration - ${device?.name}`" data-el="team-device-config-dialog">
        <template #default>
            <form class="text-gray-800">
                <template v-if="!hasCredentials">
                    <p>
                        {{ $t('ui.areYouSureYouWantToRegenerateConfigurationForThi') }}
                    </p>
                    <p class="mt-3 mb-6">
                        {{ $t('ui.theExistingConfigurationWillBeResetAndTheDeviceW') }}
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
                <ff-button kind="secondary" @click="close">{{ $t('ui.cancel') }}</ff-button>
                <ff-button kind="danger" class="ml-4" @click="regenerateCredentials()">{{ $t('ui.regenerateConfiguration2') }}</ff-button>
            </template>
            <template v-else>
                <ff-button class="ml-4" @click="close">{{ $t('ui.done') }}</ff-button>
            </template>
        </template>
    </ff-dialog>
</template>

<script>
import { markRaw } from 'vue'

import { t } from '../../../../i18n.js'

import ManualInstall from './components/DeviceCredentialsDialog/ManualInstall.vue'
import NpmInstallContent from './components/DeviceCredentialsDialog/NpmInstallContent.vue'
import ScriptInstallContent from './components/DeviceCredentialsDialog/ScriptInstallContent.vue'

import deviceApi from '@/api/devices.js'

import LinuxIcon from '@/components/icons/Linux.js'
import MacOSIcon from '@/components/icons/MacOS.js'
import WindowsIcon from '@/components/icons/Windows.js'

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
                        props: { label: t('ui.oneLineInstall'), title: t('ui.installRunDeviceAgent') },
                        children: [
                            { id: 'windows', component: markRaw(ScriptInstallContent), props: { label: t('ui.windows'), icon: markRaw(WindowsIcon), device: this.device, os: 'windows' } },
                            { id: 'macos', component: markRaw(ScriptInstallContent), props: { label: t('ui.macos'), icon: markRaw(MacOSIcon), device: this.device, os: 'macos' } },
                            { id: 'linux', component: markRaw(ScriptInstallContent), props: { label: t('ui.linux'), icon: markRaw(LinuxIcon), device: this.device, os: 'linux' } }
                        ]
                    },
                    {
                        id: 'npm',
                        component: markRaw(OptionTileSelector),
                        props: { label: t('ui.installViaNpm'), title: t('ui.installDeviceAgent') },
                        children: [
                            { id: 'windows', component: markRaw(NpmInstallContent), props: { label: t('ui.windows'), icon: markRaw(WindowsIcon), device: this.device, os: 'windows' } },
                            { id: 'macos', component: markRaw(NpmInstallContent), props: { label: t('ui.macos'), icon: markRaw(MacOSIcon), device: this.device, os: 'macos' } },
                            { id: 'linux', component: markRaw(NpmInstallContent), props: { label: t('ui.linux'), icon: markRaw(LinuxIcon), device: this.device, os: 'linux' } }
                        ]
                    }
                ]
            }
        }
    }
}
</script>
