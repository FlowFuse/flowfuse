import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, test, vi } from 'vitest'

const mocks = vi.hoisted(() => {
    return {
        expertStore: { setPendingInput: vi.fn() }
    }
})

vi.mock('@/stores/product-expert.js', () => ({
    useProductExpertStore: () => mocks.expertStore
}))
// The real message components pull in the full expert tree; the fold only
// needs placeholders it can expand into.
vi.mock('@/components/expert/components/messages/AiMessage.vue', () => ({
    default: { name: 'AiMessage', template: '<div data-stub="ai-message" />' }
}))
vi.mock('@/components/expert/components/messages/HumanMessage.vue', () => ({
    default: { name: 'HumanMessage', template: '<div data-stub="human-message" />' }
}))

// imported after mocks so vi.mock hoisting resolves correctly
import CollapsedQuestionTurn from '../../../../../frontend/src/components/expert/components/messages/CollapsedQuestionTurn.vue'

function answeredTurn () {
    return {
        kind: 'folded-turn',
        questionsMessage: { _uuid: 'a1', _type: 'ai', answer: [] },
        replyMessage: { _uuid: 'h1', _type: 'human', content: 'Q1? Sensors' },
        entries: [
            { question: 'Q1?', answer: 'Sensors' },
            { question: 'Q2?', answer: 'A dashboard' }
        ]
    }
}

function mountTurn (turn = answeredTurn()) {
    return mount(CollapsedQuestionTurn, {
        props: { turn }
    })
}

describe('CollapsedQuestionTurn', () => {
    beforeEach(() => {
        mocks.expertStore.setPendingInput.mockClear()
    })

    test('renders one quiet line per question with the pick as a chip', () => {
        const wrapper = mountTurn()
        const rows = wrapper.findAll('[data-el="folded-question"]')
        expect(rows.length).toBe(2)
        expect(rows[0].text()).toContain('Q1?')
        expect(rows[0].find('[data-action="edit-answer"]').text()).toContain('Sensors')
        expect(rows[1].find('[data-action="edit-answer"]').text()).toContain('A dashboard')
    })

    test('clicking a chip loads the answer into the composer for correction', async () => {
        const wrapper = mountTurn()
        await wrapper.findAll('[data-action="edit-answer"]')[0].trigger('click')
        expect(mocks.expertStore.setPendingInput).toHaveBeenCalledWith('Q1? Sensors')
    })

    test('an unanswered turn shows a skipped marker and no chips', () => {
        const turn = answeredTurn()
        turn.replyMessage = null
        turn.entries = [{ question: 'Q1?', answer: null }]
        const wrapper = mountTurn(turn)
        expect(wrapper.findAll('[data-action="edit-answer"]').length).toBe(0)
        expect(wrapper.find('[data-el="folded-question"]').text()).toContain('Skipped')
    })

    test('a multi-select answer renders one chip per pick', async () => {
        const turn = answeredTurn()
        turn.entries = [{ question: 'Q1?', answer: 'Allen-Bradley PLC, over Ethernet' }]
        const wrapper = mountTurn(turn)
        const chips = wrapper.findAll('[data-action="edit-answer"]')
        expect(chips.length).toBe(2)
        expect(chips[0].text()).toContain('Allen-Bradley PLC')
        expect(chips[1].text()).toContain('over Ethernet')

        // editing any pick loads the whole answer line for correction
        await chips[1].trigger('click')
        expect(mocks.expertStore.setPendingInput).toHaveBeenCalledWith('Q1? Allen-Bradley PLC, over Ethernet')
    })

    test('a free-form reply shows once for the turn, not repeated per question', async () => {
        const turn = answeredTurn()
        turn.replyMessage = { _uuid: 'h1', _type: 'human', content: 'typed by hand' }
        turn.entries = [{ question: 'Q1?', answer: null }, { question: 'Q2?', answer: null }]
        const wrapper = mountTurn(turn)
        const chips = wrapper.findAll('[data-action="edit-answer"]')
        expect(chips.length).toBe(1)
        expect(chips[0].text()).toContain('typed by hand')

        await chips[0].trigger('click')
        expect(mocks.expertStore.setPendingInput).toHaveBeenCalledWith('typed by hand')
    })

    test('expands to the original messages and folds back', async () => {
        const wrapper = mountTurn()
        expect(wrapper.find('[data-stub="ai-message"]').exists()).toBe(false)

        await wrapper.find('[data-action="toggle-turn"]').trigger('click')
        expect(wrapper.find('[data-stub="ai-message"]').exists()).toBe(true)
        expect(wrapper.find('[data-stub="human-message"]').exists()).toBe(true)

        await wrapper.find('[data-action="toggle-turn"]').trigger('click')
        expect(wrapper.find('[data-stub="ai-message"]').exists()).toBe(false)
    })
})
