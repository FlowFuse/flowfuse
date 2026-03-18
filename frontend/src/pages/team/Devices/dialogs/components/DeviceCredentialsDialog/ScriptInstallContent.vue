<template>
    <section>
        <div class="grid grid-cols-1 gap-4 mb-4">
            <div class="p-2 border rounded bg-gray-50">
                <TerminalCommandSection :title="title" :command="command" />
            </div>
        </div>
        <p class="text-gray-600 italic text-sm">
            Note: For more detailed instructions on installing the Device Agent, checkout the documentation
            <a href="https://flowfuse.com/docs/device-agent/" target="_blank">here</a>.
        </p>
    </section>
</template>

<script>
import TerminalCommandSection from './TerminalCommandSection.vue'

export default {
    name: 'ScriptInstallContent',
    components: { TerminalCommandSection },
    inheritAttrs: false,
    props: {
        title: {
            type: String,
            required: true
        },
        command: {
            type: String,
            required: true
        }
    }
}
</script>
