<template>
    <span v-ff-tooltip:bottom="toggleTip">
        <ff-toggle-switch
            v-model="developerModeLocal"
            mode="async"
            :loading="busy"
            :disabled="toggleDisabled"
            @click="toggleDeveloperMode"
        >
            <CodeIcon />
        </ff-toggle-switch>
    </span>
</template>

<script>
import { CodeIcon } from '@heroicons/vue/outline'
import semver from 'semver'

import alerts from '../../../services/alerts.js'
import Dialog from '../../../services/dialog.js'

export default {
    name: 'DeveloperModeToggle',
    components: {
        CodeIcon
    },
    props: {
        device: {
            type: Object,
            required: true
        }
    },
    emits: ['mode-change'],
    data () {
        return {
            unsupportedVersion: false,
            busy: false,
            developerModeLocal: false
        }
    },
    computed: {
        toggleDisabled () {
            return this.unsupportedVersion || this.busy
        },
        developerMode () {
            return this.device?.mode === 'developer'
        },
        toggleTip () {
            if (this.unsupportedVersion) {
                return 'Developer Mode unavailable'
            } else {
                return `Developer Mode: ${this.device.mode === 'developer' ? 'Enabled' : 'Disabled'}`
            }
        }
    },
    watch: {
        developerMode () {
            this.developerModeLocal = this.developerMode
        }
    },
    beforeMount () {
        this.unsupportedVersion = !(this.device?.agentVersion && semver.gte(this.device?.agentVersion, '0.8.0'))
        this.developerModeLocal = this.developerMode
    },
    methods: {
        async toggleDeveloperMode () {
            this.busy = true
            if (this.developerMode) {
                const msg = {
                    header: 'Disable Developer Mode',
                    kind: 'danger',
                    confirmLabel: 'Confirm',
                    html: `<p>
                        Disabling developer mode will turn off access to the editor and
                        may redeploy the current target snapshot to the device.
                    </p>
                    <p>
                        Any changes made to the device whilst in developer mode will be lost.
                    </p>
                    <p>
                        To avoid losses, you can cancel this operation and create a snapshot
                        in the developer mode tab.
                    </p>`
                }
                const dialogResult = await Dialog.showAsync(msg)
                if (dialogResult === 'confirm') {
                    await this.setDeveloperMode(false)
                }
            } else {
                await this.setDeveloperMode(true)
            }
            this.busy = false
        },
        async setDeveloperMode (devModeOn) {
            this.busy = true
            // perform the mode change to the selected mode. @see DevicePage.setDeviceMode
            this.$emit('mode-change', devModeOn ? 'developer' : 'autonomous', (err, _result) => {
                if (err) {
                    console.warn('Error setting developer mode', err)
                    alerts.emit(err.message, 'warning', 7000)
                } else if (_result) {
                    this.developerModeLocal = _result.mode === 'developer'
                }
                this.busy = false
            })
        }
    }
}
</script>
