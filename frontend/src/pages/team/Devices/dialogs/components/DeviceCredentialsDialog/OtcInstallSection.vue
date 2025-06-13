<template>
    <section>
        <label class="block font-bold mb-2">Install Device Agent</label>

        <div class="mb-4">
            <OsSelector :selected-o-s="selectedOS" @select-os="$emit('select-os', $event)" />

            <div class="grid grid-cols-1 gap-4">
                <div class="p-2 border rounded bg-gray-50">
                    <TerminalCommandSection
                        v-if="selectedOS === 'Windows'"
                        title="Open Command Prompt or PowerShell as administrator and run:"
                        command="npm install -g @flowfuse/device-agent"
                    />
                    <TerminalCommandSection
                        v-if="selectedOS === 'MacOS'"
                        title="Open Terminal and run:"
                        command="sudo npm install -g @flowfuse/device-agent"
                    />
                    <TerminalCommandSection
                        v-if="selectedOS === 'Linux'"
                        title="Open Terminal and run:"
                        command="sudo npm install -g @flowfuse/device-agent"
                    />
                </div>
            </div>
        </div>

        <p class="text-gray-600 italic text-sm">
            Note: For more detailed instructions on installing the Device Agent, checkout the documentation <a href="https://flowfuse.com/docs/device-agent/" target="_blank">here</a>.
        </p>

        <label class="block font-bold mt-4 mb-2">Connect Agent to FlowFuse</label>
        <TerminalCommandSection
            title="Then, with the Device Agent installed, run the following command, on your hardware, to connect it to FlowFuse:"
            :command="otcCommand"
        />

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
    </section>
</template>

<script>

import clipboardMixin from '../../../../../../mixins/Clipboard.js'

import Alerts from '../../../../../../services/alerts.js'

import ManualInstall from './ManualInstall.vue'
import OsSelector from './OsSelector.vue'
import TerminalCommandSection from './TerminalCommandSection.vue'

export default {
    name: 'OtcInstallSection',
    components: {
        OsSelector,
        TerminalCommandSection,
        ManualInstall
    },
    mixins: [clipboardMixin],
    props: {
        credentials: {
            type: String,
            required: true
        },
        device: {
            type: Object,
            required: true
        },
        otcCommand: {
            type: String,
            required: true
        },
        selectedOS: {
            type: String,
            required: true
        }
    },
    emits: ['select-os'],
    methods: {
        copy (text) {
            this.copyToClipboard(text).then(() => {
                Alerts.emit('Copied to Clipboard.', 'confirmation')
            }).catch((err) => {
                console.warn('Clipboard write permission denied: ', err)
                Alerts.emit('Clipboard write permission denied.', 'warning')
            })
        }
    }
}
</script>

<style scoped lang="scss">

</style>
