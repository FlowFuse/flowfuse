<template>
    <section>
        <div class="grid grid-cols-1 gap-4 mb-4">
            <div class="p-2 border rounded-sm bg-gray-50">
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
import { mapState } from 'pinia'

import TerminalCommandSection from './TerminalCommandSection.vue'

import { useAccountSettingsStore } from '@/stores/account-settings.js'

const OS_CONFIG = {
    windows: {
        title: 'Open an elevated Command Prompt and run:',
        commandPrefix: 'powershell -c "irm https://flowfuse.github.io/device-agent/get.ps1|iex" && flowfuse-device-agent-installer.exe'
    },
    macos: {
        title: 'Open Terminal and run:',
        commandPrefix: '/bin/bash -c "$(curl -fsSL https://flowfuse.github.io/device-agent/get.sh)" && \\\n./flowfuse-device-agent-installer'
    },
    linux: {
        title: 'Open Terminal and run:',
        commandPrefix: '/bin/bash -c "$(curl -fsSL https://flowfuse.github.io/device-agent/get.sh)" && \\\n./flowfuse-device-agent-installer'
    }
}

export default {
    name: 'ScriptInstallContent',
    components: { TerminalCommandSection },
    inheritAttrs: false,
    props: {
        device: {
            type: Object,
            required: true
        },
        os: {
            type: String,
            required: true
        }
    },
    computed: {
        ...mapState(useAccountSettingsStore, ['settings']),
        title () {
            return OS_CONFIG[this.os]?.title ?? ''
        },
        command () {
            const prefix = OS_CONFIG[this.os]?.commandPrefix ?? ''
            return `${prefix} -o ${this.device.credentials.otc} -u ${this.settings?.base_url}`
        }
    }
}
</script>
