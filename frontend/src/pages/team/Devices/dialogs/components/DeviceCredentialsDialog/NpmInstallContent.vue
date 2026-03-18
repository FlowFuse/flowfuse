<template>
    <section>
        <div class="grid grid-cols-1 gap-4 mb-4">
            <div class="p-2 border rounded bg-gray-50">
                <TerminalCommandSection :title="installTitle" :command="installCommand" />
            </div>
        </div>
        <p class="text-gray-600 italic text-sm">
            Note: For more detailed instructions on installing the Device Agent, checkout the documentation
            <a href="https://flowfuse.com/docs/device-agent/" target="_blank">here</a>.
        </p>

        <label class="block font-bold mt-4 mb-2">Connect Agent to FlowFuse</label>
        <TerminalCommandSection
            title="Then, with the Device Agent installed, run the following command, on your hardware, to connect it to FlowFuse:"
            :command="otcCommand"
        />

        <div class="text-gray-600 italic text-sm">
            <span>Notes:</span>
            <ul class="list-disc list-inside ml-2">
                <li>this command is single use and expires in 24h.</li>
                <li>requires device-agent v2.1 or later (follow the manual setup below for older versions).</li>
            </ul>
        </div>

        <details class="mt-4">
            <summary class="mt-6 cursor-pointer">Show manual setup instructions</summary>
            <ManualInstall class="mt-4" :credentials="credentials" :device="device" />
        </details>
    </section>
</template>

<script>
import ManualInstall from './ManualInstall.vue'
import TerminalCommandSection from './TerminalCommandSection.vue'

export default {
    name: 'NpmInstallContent',
    components: { ManualInstall, TerminalCommandSection },
    inheritAttrs: false,
    props: {
        installTitle: {
            type: String,
            required: true
        },
        installCommand: {
            type: String,
            required: true
        },
        otcCommand: {
            type: String,
            required: true
        },
        credentials: {
            type: String,
            required: true
        },
        device: {
            type: Object,
            required: true
        }
    }
}
</script>
