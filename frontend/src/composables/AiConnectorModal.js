import { markRaw } from 'vue'

import AiConnectorModal from '../components/dialogs/AiConnectorModal.vue'
import Dialog from '../services/dialog.js'

import { useUxToursStore } from '@/stores/ux-tours.js'

export function useAiConnectorModal () {
    const open = () => {
        // Opening resets the ten-day auto-show window, manual opens included
        useUxToursStore().markAiConnectorShown()
        Dialog.show({
            header: 'Connect your AI agent to FlowFuse',
            boxClass: 'max-w-[64rem]! w-full!',
            canBeCanceled: false,
            confirmLabel: 'Close',
            is: {
                component: markRaw(AiConnectorModal)
            }
        })
    }

    return { open }
}
