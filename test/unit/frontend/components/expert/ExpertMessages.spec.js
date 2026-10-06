import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

const mocks = vi.hoisted(() => {
    return {
        expertStore: { messages: [], isWaitingForResponse: false }
    }
})

vi.mock('@/stores/product-expert.js', () => ({
    useProductExpertStore: () => mocks.expertStore
}))
// The message components pull in the full expert tree; the list only needs placeholders
vi.mock('@/components/expert/components/messages/AiMessage.vue', () => ({
    default: { name: 'AiMessage', template: '<div data-stub="ai-message" />' }
}))
vi.mock('@/components/expert/components/messages/HumanMessage.vue', () => ({
    default: { name: 'HumanMessage', template: '<div data-stub="human-message" />' }
}))
vi.mock('@/components/expert/components/messages/CollapsedQuestionTurn.vue', () => ({
    default: { name: 'CollapsedQuestionTurn', template: '<div data-stub="folded-turn" />' }
}))
vi.mock('@/components/expert/components/messages/FlowFuseEventCard.vue', () => ({
    default: { name: 'FlowFuseEventCard', template: '<div data-stub="event-card" />' }
}))
vi.mock('@/components/expert/components/messages/SystemMessage.vue', () => ({
    default: { name: 'SystemMessage', template: '<div data-stub="system-message" />' }
}))
vi.mock('@/components/expert/components/ExpertLoadingIndicator.vue', () => ({
    default: { name: 'ExpertLoadingIndicator', template: '<div data-stub="loading" />' }
}))

// imported after mocks so vi.mock hoisting resolves correctly
import ExpertMessages from '../../../../../frontend/src/components/expert/components/ExpertMessages.vue'

const chat = (uuid, content) => ({ _uuid: uuid, _type: 'ai', answer: [{ kind: 'chat', content }] })
const reply = (uuid, content) => ({ _uuid: uuid, _type: 'human', content })

function mountList (surface) {
    return mount(ExpertMessages, {
        global: { provide: surface ? { 'expert-surface': surface } : {} }
    })
}

function entryClasses (wrapper) {
    return wrapper.findAll('li').map(li => li.classes().filter(name => ['turn-start', 'answered', 'has-questions'].includes(name)))
}

describe('ExpertMessages', () => {
    const OriginalResizeObserver = globalThis.ResizeObserver

    beforeEach(() => {
        globalThis.ResizeObserver = class {
            observe () {}
            disconnect () {}
        }
        mocks.expertStore.messages = [chat('a1', 'What are you building?'), reply('h1', 'A live screen'), chat('a2', 'Got it')]
        mocks.expertStore.isWaitingForResponse = false
    })

    afterEach(() => {
        globalThis.ResizeObserver = OriginalResizeObserver
    })

    test.each(['onboarding', 'building'])('marks the turn structure on the %s surface', (surface) => {
        const wrapper = mountList(surface)
        expect(entryClasses(wrapper)).toEqual([['answered'], [], ['turn-start']])
    })

    test('adds no turn classes in the drawer', () => {
        const wrapper = mountList()
        expect(entryClasses(wrapper)).toEqual([[], [], []])
    })

    test.each(['onboarding', 'building'])('puts the loading indicator where the next turn starts on the %s surface', (surface) => {
        mocks.expertStore.messages = [chat('a1', 'What are you building?'), reply('h1', 'A live screen')]
        mocks.expertStore.isWaitingForResponse = true
        const wrapper = mountList(surface)
        expect(wrapper.findAll('li').at(-1).classes()).toContain('turn-start')
    })

    test('keeps the drawer\'s loading indicator unmarked', () => {
        mocks.expertStore.messages = [chat('a1', 'What are you building?'), reply('h1', 'A live screen')]
        mocks.expertStore.isWaitingForResponse = true
        const wrapper = mountList()
        expect(wrapper.findAll('li').at(-1).classes()).not.toContain('turn-start')
    })
})
