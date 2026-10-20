import { createTestingPinia } from '@pinia/testing'
import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, test, vi } from 'vitest'

vi.mock('../../../../../frontend/src/services/product.js', () => ({
    default: { capture: vi.fn() }
}))

const TurnFeedback = (await import('../../../../../frontend/src/components/expert/components/messages/components/TurnFeedback.vue')).default
const { useProductExpertStore } = await import('../../../../../frontend/src/stores/product-expert.js')

const FfButton = {
    name: 'ff-button',
    props: ['kind', 'disabled'],
    template: '<button :disabled="disabled"><slot name="icon" /><slot /></button>'
}

function mountFeedback (props = {}) {
    const pinia = createTestingPinia({ createSpy: vi.fn, stubActions: true })
    const store = useProductExpertStore(pinia)
    const wrapper = mount(TurnFeedback, {
        props: { messageUuid: 'm1', ...props },
        global: {
            plugins: [pinia],
            components: { 'ff-button': FfButton },
            directives: { 'ff-tooltip': {} }
        }
    })
    return { wrapper, store }
}

const up = (wrapper) => wrapper.find('[data-action="vote-up"]')
const down = (wrapper) => wrapper.find('[data-action="vote-down"]')

describe('TurnFeedback', () => {
    test('offers both thumbs unpressed, labelled, with no share offer', () => {
        const { wrapper } = mountFeedback()

        expect(up(wrapper).attributes('aria-label')).toBe('Good answer')
        expect(down(wrapper).attributes('aria-label')).toBe('Bad answer')
        expect(up(wrapper).attributes('aria-pressed')).toBe('false')
        expect(down(wrapper).attributes('aria-pressed')).toBe('false')
        expect(wrapper.find('[data-el="share-offer"]').classes()).not.toContain('open')
    })

    test('votes through the store', async () => {
        const { wrapper, store } = mountFeedback()

        await up(wrapper).trigger('click')
        await flushPromises()

        expect(store.rateTurn).toHaveBeenCalledWith('m1', 'up')
    })

    test('shows the held vote as pressed and does nothing on the pressed thumb', async () => {
        const { wrapper, store } = mountFeedback({ vote: 'up' })

        expect(up(wrapper).attributes('aria-pressed')).toBe('true')
        expect(down(wrapper).attributes('aria-pressed')).toBe('false')

        await up(wrapper).trigger('click')
        expect(store.rateTurn).not.toHaveBeenCalled()

        await down(wrapper).trigger('click')
        expect(store.rateTurn).toHaveBeenCalledWith('m1', 'down')
    })

    test('opens the share offer after a vote and shares on request', async () => {
        const { wrapper, store } = mountFeedback({ vote: 'down' })

        expect(wrapper.find('[data-el="share-offer"]').classes()).toContain('open')

        await wrapper.find('[data-action="share"]').trigger('click')
        await flushPromises()

        expect(store.shareTurnConversation).toHaveBeenCalledWith('m1')
    })

    test('remembers a dismissal through the store', async () => {
        const { wrapper, store } = mountFeedback({ vote: 'up' })

        await wrapper.find('[data-action="dismiss-share"]').trigger('click')

        expect(store.dismissTurnShare).toHaveBeenCalledWith('m1')
    })

    test('closes the offer once dismissed or shared, and confirms a share', () => {
        const dismissed = mountFeedback({ vote: 'up', shareDismissed: true }).wrapper
        expect(dismissed.find('[data-el="share-offer"]').classes()).not.toContain('open')
        expect(dismissed.find('[data-el="share-confirmed"]').exists()).toBe(false)

        const shared = mountFeedback({ vote: 'up', shared: true }).wrapper
        expect(shared.find('[data-el="share-offer"]').classes()).not.toContain('open')
        expect(shared.find('[data-el="share-confirmed"]').text()).toBe('Conversation shared. Thank you.')
    })
})
