import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, test, vi } from 'vitest'

vi.mock('../../../../../frontend/src/services/product.js', () => ({
    default: { capture: vi.fn() }
}))

// The flows list pulls in the CJS flow renderer, which cannot load in the test environment
vi.mock('@flowfuse/flow-renderer', () => ({
    default: class FlowRenderer {}
}))

const AiMessage = (await import('../../../../../frontend/src/components/expert/components/messages/AiMessage.vue')).default

const stubs = {
    'answer-wrapper': true,
    'rich-content': true
}

function mountMessage (answer) {
    return mount(AiMessage, {
        props: { answer, _type: 'ai', _timestamp: 1, _uuid: 'm1', _streamed: true, instant: true },
        global: { stubs }
    })
}

describe('AiMessage', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
    })

    test('renders tool records without a reason as cards, in array order', () => {
        const wrapper = mountMessage([
            { kind: 'mcp_tool', toolTitle: 'Get flows', _uuid: 'a' },
            { kind: 'mcp_tool', toolTitle: 'List instances', id: 't2', reason: 'Finding the instance', _uuid: 'b' },
            { kind: 'chat', content: 'Done', _uuid: 'c' }
        ])

        const headlines = wrapper.findAll('.ff-expert-timeline-item--name').map(n => n.text())
        expect(headlines).toEqual(['Get flows', 'Finding the instance'])
        expect(wrapper.findAll('.ff-expert-timeline-item--tool').map(n => n.text())).toEqual(['List instances'])
        expect(wrapper.findAll('.ff-expert-timeline-item--reason').map(n => n.text())).toEqual(['Finding the instance'])
    })

    test('keeps streaming reasoning collapsed with its latest sentence in the header', () => {
        const wrapper = mountMessage([
            { kind: 'reasoning', id: 'r1', seq: 1, text: 'Reading the flow. Now **checking** the wires', done: false, _uuid: 'a' },
            { kind: 'reasoning', id: 'r2', seq: 2, text: 'Done thinking.', done: true, _uuid: 'b' }
        ])

        expect(wrapper.findAll('.ff-collapsible--content.expanded')).toHaveLength(0)
        expect(wrapper.findAll('.ff-expert-reasoning--preview').map(n => n.text())).toEqual(['Now checking the wires'])
    })

    test('interleaves reasoning, tool cards and messages in answer order', () => {
        const wrapper = mountMessage([
            { kind: 'reasoning', id: 'r1', seq: 1, text: 'Plan', done: true, _uuid: 'a' },
            { kind: 'mcp_tool', id: 't1', seq: 2, toolTitle: 'Get flows', ok: false, error: 'boom', _uuid: 'b' },
            { kind: 'message', id: 'm1', seq: 3, text: 'Working on it', _uuid: 'c' }
        ])

        const order = wrapper.element.children
        expect(order[0].classList.contains('ff-expert-reasoning')).toBe(true)
        expect(order[1].classList.contains('ff-expert-timeline-item')).toBe(true)
        expect(order[2].classList.contains('ff-expert-agent-message')).toBe(true)
        expect(wrapper.find('.ff-expert-timeline-item--failed-hint').exists()).toBe(true)
    })
})
