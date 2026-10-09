import { createTestingPinia } from '@pinia/testing'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, test, vi } from 'vitest'

vi.mock('../../../../../frontend/src/services/product.js', () => ({
    default: {
        capture: vi.fn()
    }
}))

const Product = (await import('../../../../../frontend/src/services/product.js')).default
const ExpertChatInput = (await import('../../../../../frontend/src/components/expert/components/ExpertChatInput.vue')).default
const { useContextStore } = await import('../../../../../frontend/src/stores/context.js')
const { useProductAssistantStore } = await import('../../../../../frontend/src/stores/product-assistant.js')
const { useProductExpertStore } = await import('../../../../../frontend/src/stores/product-expert.js')
const { useUxDrawersStore } = await import('../../../../../frontend/src/stores/ux-drawers.js')

function shownEvents () {
    return Product.capture.mock.calls.filter(([event]) => event === 'ff-expert-suggestions-shown')
}

function mountInput ({ immersive = false, editorDrawerOpen = true } = {}) {
    const pinia = createTestingPinia({ createSpy: vi.fn, stubActions: true })

    const drawers = useUxDrawersStore(pinia)
    drawers.editorImmersiveDrawer.state = editorDrawerOpen

    useContextStore(pinia).team = { id: 'team-1' }
    useProductAssistantStore(pinia).isImmersiveInstance = immersive
    const expert = useProductExpertStore(pinia)
    expert.messages = []
    expert.isSessionExpired = false
    expert.isInsightsAgent = false
    expert.isWaitingForResponse = false
    expert.handleQuery.mockResolvedValue()

    const wrapper = mount(ExpertChatInput, {
        global: {
            plugins: [pinia],
            // the instance and device editor pages provide this
            provide: immersive ? { 'expert-surface': 'immersive' } : {},
            stubs: {
                teleport: true,
                'resize-bar': true,
                'default-chip': true,
                'capabilities-selector': true,
                'context-selector': true,
                'tool-permissions-settings': true,
                'ff-dialog': true,
                'ff-toggle-switch': true,
                'ff-radio-group': true
            }
        }
    })
    return { wrapper, drawers, expert }
}

describe('ExpertChatInput prompt suggestion tracking', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    test('reports the three suggestions as shown once they are on screen', async () => {
        const { wrapper } = mountInput()
        await wrapper.vm.$nextTick()

        expect(shownEvents()).toHaveLength(1)
        const [, properties, groups] = shownEvents()[0]
        expect(properties).toEqual({
            ids: wrapper.vm.suggestions.map(s => s.id),
            titles: wrapper.vm.suggestions.map(s => s.title),
            surface: 'drawer'
        })
        expect(properties.titles).toHaveLength(3)
        expect(groups).toEqual({ team: 'team-1' })
    })

    test('typing and clearing the box does not count as a second impression', async () => {
        const { wrapper } = mountInput()
        await wrapper.vm.$nextTick()

        await wrapper.find('textarea').setValue('hello')
        await wrapper.find('textarea').setValue('')

        expect(shownEvents()).toHaveLength(1)
    })

    test('a fresh deal from Start over is reported again', async () => {
        const { wrapper, expert } = mountInput()
        await wrapper.vm.$nextTick()

        expert.hasMessages = true
        wrapper.vm.handleStartOver()
        await wrapper.vm.$nextTick()

        expect(shownEvents()).toHaveLength(2)
        expect(shownEvents()[1][1].ids).toEqual(wrapper.vm.suggestions.map(s => s.id))
    })

    test('in the editor, nothing is reported while the drawer is closed', async () => {
        const { wrapper, drawers } = mountInput({ immersive: true, editorDrawerOpen: false })
        await wrapper.vm.$nextTick()
        expect(shownEvents()).toHaveLength(0)

        drawers.editorImmersiveDrawer.state = true
        await wrapper.vm.$nextTick()
        expect(shownEvents()).toHaveLength(1)
        expect(shownEvents()[0][1].surface).toBe('immersive')
    })

    test('reports which suggestion was clicked and where it sat', async () => {
        const { wrapper } = mountInput()
        await wrapper.vm.$nextTick()
        const second = wrapper.vm.suggestions[1]

        await wrapper.findAll('[data-action="use-prompt-suggestion"]')[1].trigger('click')

        expect(Product.capture).toHaveBeenCalledWith('ff-expert-suggestion-clicked', {
            id: second.id,
            title: second.title,
            position: 2,
            needs_input: !!second.needsInput,
            surface: 'drawer'
        }, { team: 'team-1' })
    })
})

describe('ExpertChatInput controls', () => {
    const { computed } = ExpertChatInput

    function controls (expertSurface) {
        const vm = { expertSurface }
        vm.isFullPageSurface = computed.isFullPageSurface.call(vm)
        return {
            actionBar: computed.showActionButtons.call(vm),
            sessionControls: computed.showSessionControls.call(vm)
        }
    }

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
