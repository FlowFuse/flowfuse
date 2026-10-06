import { mount } from '@vue/test-utils'
import { describe, expect, test, vi } from 'vitest'

// The rich-text renderer pulls in the markdown and store stack; the label check only needs a placeholder
vi.mock('@/components/expert/components/messages/components/resources/StreamableContent.vue', () => ({
    default: { name: 'StreamableContent', props: ['string'], template: '<div data-stub="streamable-content">{{ string }}</div>' }
}))

// imported after mocks so vi.mock hoisting resolves correctly
import HumanMessage from '../../../../../frontend/src/components/expert/components/messages/HumanMessage.vue'

function mountMessage (provide = {}) {
    return mount(HumanMessage, {
        props: { content: 'A live screen for my machine', _timestamp: 0, _type: 'human' },
        global: { provide }
    })
}

describe('HumanMessage', () => {
    test.each(['onboarding', 'building'])('labels the message as the person\'s own on the %s surface', (surface) => {
        const wrapper = mountMessage({ 'expert-surface': surface })
        expect(wrapper.find('[data-el="reply-label"]').text()).toBe('You')
        expect(wrapper.text()).toContain('A live screen for my machine')
    })

    test('renders no label in the drawer', () => {
        const wrapper = mountMessage()
        expect(wrapper.find('[data-el="reply-label"]').exists()).toBe(false)
        expect(wrapper.text()).toContain('A live screen for my machine')
    })
})
