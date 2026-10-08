import { describe, expect, test, vi } from 'vitest'

vi.mock('@/stores/product-expert.js', () => ({ useProductExpertStore: () => ({}) }))
vi.mock('@/stores/product-assistant.js', () => ({ useProductAssistantStore: () => ({}) }))
vi.mock('@/stores/ux-drawers.js', () => ({ useUxDrawersStore: () => ({}) }))

// imported after mocks so vi.mock hoisting resolves correctly
import ExpertChatInput from '../../../../../frontend/src/components/expert/components/ExpertChatInput.vue'

const { computed } = ExpertChatInput

function controls (expertSurface) {
    const vm = { expertSurface }
    vm.isFullPageSurface = computed.isFullPageSurface.call(vm)
    return {
        actionBar: computed.showActionButtons.call(vm),
        sessionControls: computed.showSessionControls.call(vm)
    }
}

describe('ExpertChatInput controls', () => {
    test('the drawer gets the full action bar', () => {
        expect(controls('drawer')).toEqual({ actionBar: true, sessionControls: true })
    })

    // Building can call write tools, so the tool permissions have to be reachable;
    // start over and plan mode stay with the page, which drives them itself
    test('building gets the bar for the settings only', () => {
        expect(controls('building')).toEqual({ actionBar: true, sessionControls: false })
    })

    test('onboarding gets no action bar', () => {
        expect(controls('onboarding').actionBar).toBe(false)
    })
})
