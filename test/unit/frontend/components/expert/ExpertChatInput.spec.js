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

function mountInput ({ immersive = false, editorDrawerOpen = true, provide } = {}) {
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
            provide: provide ?? (immersive ? { 'expert-surface': 'immersive' } : {}),
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

describe('ExpertChatInput on the overview', () => {
    function mountOverview ({ chatOpen }) {
        const mounted = mountInput({ provide: { 'expert-surface': 'overview', 'expert-chat-open': chatOpen } })
        mounted.expert.messages = [{ _type: 'human' }, { _type: 'ai' }]
        mounted.expert.startNewChat.mockResolvedValue()
        return mounted
    }

    beforeEach(() => {
        vi.clearAllMocks()
    })

    test('a message sent while the conversation is folded away starts a new chat', async () => {
        const { wrapper, expert } = mountOverview({ chatOpen: false })

        await wrapper.find('textarea').setValue('how are my instances?')
        await wrapper.find('textarea').trigger('keydown', { key: 'Enter' })

        expect(expert.startNewChat).toHaveBeenCalledWith({ query: 'how are my instances?' })
        expect(expert.handleQuery).not.toHaveBeenCalled()
    })

    test('a message sent in the open conversation continues it', async () => {
        const { wrapper, expert } = mountOverview({ chatOpen: true })

        await wrapper.find('textarea').setValue('and the devices?')
        await wrapper.find('textarea').trigger('keydown', { key: 'Enter' })

        expect(expert.handleQuery).toHaveBeenCalledWith({ query: 'and the devices?' })
        expect(expert.startNewChat).not.toHaveBeenCalled()
    })

    test('an expired conversation does not lock the folded composer', async () => {
        const { wrapper, expert } = mountOverview({ chatOpen: false })
        expert.isSessionExpired = true
        expert.isInputDisabled = true
        expert.isNewChatDisabled = false
        await wrapper.vm.$nextTick()

        expect(wrapper.find('textarea').attributes('disabled')).toBeUndefined()
        expect(wrapper.find('.btn-send').exists()).toBe(true)
    })

    test('a live reply locks the folded composer and says how to unlock it', async () => {
        const { wrapper, expert } = mountOverview({ chatOpen: false })
        expert.isWaitingForResponse = true
        expert.isNewChatDisabled = true
        await wrapper.vm.$nextTick()

        const textarea = wrapper.find('textarea')
        expect(textarea.attributes('disabled')).toBeDefined()
        expect(textarea.attributes('placeholder')).toBe('The Expert is still replying. Stop it to start a new chat')
        expect(wrapper.find('.btn-stop').exists()).toBe(true)
    })
})
