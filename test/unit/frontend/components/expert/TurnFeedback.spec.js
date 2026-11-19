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
            components: { 'ff-button': FfButton, 'ff-checkbox': FfCheckbox },
            directives: { 'ff-tooltip': {} }
        }
    })
    return { wrapper, store }
}

const up = (wrapper) => wrapper.find('[data-action="vote-up"]')
const down = (wrapper) => wrapper.find('[data-action="vote-down"]')

const FfCheckbox = {
    name: 'ff-checkbox',
    props: ['modelValue', 'label'],
    emits: ['update:modelValue'],
    template: '<label><input type="checkbox" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)">{{ label }}</label>'
}

const panel = (wrapper) => wrapper.find('[data-el="feedback-panel"]')
const sendButton = (wrapper) => wrapper.find('[data-action="send-feedback"]')

describe('TurnFeedback', () => {
    test('offers both thumbs unpressed, labelled, with a closed panel', () => {
        const { wrapper } = mountFeedback()

        expect(up(wrapper).attributes('aria-label')).toBe('Good answer')
        expect(down(wrapper).attributes('aria-label')).toBe('Bad answer')
        expect(up(wrapper).attributes('aria-pressed')).toBe('false')
        expect(down(wrapper).attributes('aria-pressed')).toBe('false')
        expect(panel(wrapper).classes()).not.toContain('open')
    })

    test('votes through the store', async () => {
        const { wrapper, store } = mountFeedback()

        await up(wrapper).trigger('click')
        await flushPromises()

        expect(store.rateTurn).toHaveBeenCalledWith('m1', 'up')
    })

    test('shows the held vote by the solid icon alone, keeping both buttons the same kind', () => {
        const { wrapper } = mountFeedback({ vote: 'up' })
        const buttons = wrapper.findAllComponents(FfButton).filter(b => b.attributes('data-action')?.startsWith('vote-'))

        expect(up(wrapper).attributes('aria-pressed')).toBe('true')
        expect(down(wrapper).attributes('aria-pressed')).toBe('false')
        expect(buttons.map(b => b.props('kind'))).toEqual(['plain', 'plain'])
        expect(up(wrapper).find('svg').attributes('viewBox')).toBe('0 0 20 20')
        expect(down(wrapper).find('svg').attributes('viewBox')).toBe('0 0 24 24')
    })

    test('does nothing on the pressed thumb and switches on the other', async () => {
        const { wrapper, store } = mountFeedback({ vote: 'up' })

        await up(wrapper).trigger('click')
        expect(store.rateTurn).not.toHaveBeenCalled()

        await down(wrapper).trigger('click')
        expect(store.rateTurn).toHaveBeenCalledWith('m1', 'down')
    })

    test('opens the panel after a vote with a placeholder for that vote', () => {
        const good = mountFeedback({ vote: 'up' }).wrapper
        expect(panel(good).classes()).toContain('open')
        expect(good.find('[data-el="feedback-comment"]').attributes('placeholder')).toBe('What was good about this answer? (optional)')
        expect(good.find('[data-el="feedback-comment"]').attributes('maxlength')).toBe('2000')

        const bad = mountFeedback({ vote: 'down' }).wrapper
        expect(bad.find('[data-el="feedback-comment"]').attributes('placeholder')).toBe('What went wrong? (optional)')
    })

    test('ticks the share checkbox by default', () => {
        const { wrapper } = mountFeedback({ vote: 'up' })

        expect(wrapper.find('input[type="checkbox"]').element.checked).toBe(true)
        expect(sendButton(wrapper).attributes('disabled')).toBeUndefined()
    })

    test('keeps send disabled while unticked until there is a comment', async () => {
        const { wrapper } = mountFeedback({ vote: 'up' })
        await wrapper.find('input[type="checkbox"]').setValue(false)
        expect(sendButton(wrapper).attributes('disabled')).toBeDefined()

        await wrapper.find('[data-el="feedback-comment"]').setValue('   ')
        expect(sendButton(wrapper).attributes('disabled')).toBeDefined()

        await wrapper.find('[data-el="feedback-comment"]').setValue('Helpful')
        expect(sendButton(wrapper).attributes('disabled')).toBeUndefined()
    })

    test('sends the comment and the share choice through the store', async () => {
        const { wrapper, store } = mountFeedback({ vote: 'down' })

        await wrapper.find('[data-el="feedback-comment"]').setValue('Wrong node')
        await sendButton(wrapper).trigger('click')
        await flushPromises()

        expect(store.submitTurnFeedback).toHaveBeenCalledWith('m1', { comment: 'Wrong node', share: true })
    })

    test('sends without the conversation once unticked', async () => {
        const { wrapper, store } = mountFeedback({ vote: 'down' })

        await wrapper.find('[data-el="feedback-comment"]').setValue('Wrong node')
        await wrapper.find('input[type="checkbox"]').setValue(false)
        await sendButton(wrapper).trigger('click')
        await flushPromises()

        expect(store.submitTurnFeedback).toHaveBeenCalledWith('m1', { comment: 'Wrong node', share: false })
    })

    test('describes what sharing includes', () => {
        const { wrapper } = mountFeedback({ vote: 'up' })

        expect(wrapper.text()).toContain('Include this conversation')
        expect(wrapper.text()).toContain('Shares your messages, the answers, and any flows or debug output up to this answer with FlowFuse.')
    })

    test('remembers a dismissal through the store', async () => {
        const { wrapper, store } = mountFeedback({ vote: 'up' })

        await wrapper.find('[data-action="dismiss-feedback"]').trigger('click')

        expect(store.dismissTurnFeedback).toHaveBeenCalledWith('m1')
    })

    test('closes the panel once dismissed or sent, and confirms a send', () => {
        const dismissed = mountFeedback({ vote: 'up', feedbackDismissed: true }).wrapper
        expect(panel(dismissed).classes()).not.toContain('open')
        expect(dismissed.find('[data-el="feedback-confirmed"]').exists()).toBe(false)

        const sent = mountFeedback({ vote: 'up', feedbackSent: true }).wrapper
        expect(panel(sent).classes()).not.toContain('open')
        expect(sent.find('[data-el="feedback-confirmed"]').text()).toBe('Thanks for your feedback.')

        const shared = mountFeedback({ vote: 'up', feedbackSent: true, shared: true }).wrapper
        expect(shared.find('[data-el="feedback-confirmed"]').text()).toBe('Thanks for your feedback. Conversation shared.')
    })
})
