<template>
    <section>
        <div class="grid grid-cols-1 gap-4 mb-4">
            <div class="p-2 border rounded-sm bg-gray-50">
                <TerminalCommandSection :title="installTitle" :command="installCommand" />
            </div>
        </div>
        <p class="text-gray-600 italic text-sm">
            {{ $t('ui.noteForMoreDetailedInstructionsOnInstallingTheDe') }}
            <a href="https://flowfuse.com/docs/device-agent/" target="_blank">{{ $t('ui.here') }}</a>.
        </p>

        <label class="block font-bold mt-4 mb-2">{{ $t('ui.connectAgentToFlowfuse') }}</label>
        <TerminalCommandSection
            :title="$t('ui.thenWithTheDeviceAgentInstalledRunTheFollowingCo')"
            :command="otcCommand"
        />

        <div class="text-gray-600 italic text-sm">
            <span>{{ $t('ui.notes') }}</span>
            <ul class="list-disc list-inside ml-2">
                <li>{{ $t('ui.thisCommandIsSingleUseAndExpiresIn24h') }}</li>
                <li>{{ $t('ui.requiresDeviceAgentV21OrLaterFollowTheManualSetu') }}</li>
            </ul>
        </div>

        <details class="mt-4">
            <summary class="mt-6 cursor-pointer">{{ $t('ui.showManualSetupInstructions') }}</summary>
            <ManualInstall class="mt-4" :device="device" />
        </details>
    </section>
</template>

<script>
import { mapState } from 'pinia'

import ManualInstall from './ManualInstall.vue'
import TerminalCommandSection from './TerminalCommandSection.vue'

import { useAccountSettingsStore } from '@/stores/account-settings.js'

const OS_CONFIG = {
    windows: {
        installTitle: 'Open Command Prompt or PowerShell as administrator and run:',
        installCommand: 'npm install -g @flowfuse/device-agent'
    },
    macos: {
        installTitle: 'Open Terminal and run:',
        installCommand: 'sudo npm install -g @flowfuse/device-agent'
    },
    linux: {
        installTitle: 'Open Terminal and run:',
        installCommand: 'sudo npm install -g @flowfuse/device-agent'
    }
}

export default {
    name: 'NpmInstallContent',
    components: { ManualInstall, TerminalCommandSection },
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
        installTitle () {
            return OS_CONFIG[this.os]?.installTitle ?? ''
        },
        installCommand () {
            return OS_CONFIG[this.os]?.installCommand ?? ''
        },
        otcCommand () {
            return `flowfuse-device-agent -o ${this.device.credentials.otc} -u ${this.settings?.base_url}`
        }
    }
}
</script>
