<template>
    <ff-toggle-switch
        v-model="developerModeLocal"
        v-ff-tooltip:left="toggleTip"
        mode="async"
        :loading="busy"
        :disabled="toggleDisabled"
        @click="toggleDeveloperMode"
    >
        <CodeIcon />
    </ff-toggle-switch>
</template>

<script>
import { CodeIcon } from '@heroicons/vue/outline'
import semver from 'semver'

import alerts from '../../../services/alerts.js'

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
                return 'Toggle Developer Mode'
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

            // perform the mode change to the selected mode. @see DevicePage.setDeviceMode
            this.$emit('mode-change', !this.developerMode ? 'developer' : 'autonomous', (err, _result) => {
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
