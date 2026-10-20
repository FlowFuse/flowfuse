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

    test('keeps reasoning collapsed with the latest sentence while streaming and the first once done', () => {
        const wrapper = mountMessage([
            { kind: 'reasoning', id: 'r1', seq: 1, text: 'Reading the flow. Now **checking** the wires', done: false, _uuid: 'a' },
            { kind: 'reasoning', id: 'r2', seq: 2, text: 'Planning the build.\nThen deploying it.', done: true, _uuid: 'b' }
        ])

        expect(wrapper.findAll('.ff-collapsible--content.expanded')).toHaveLength(0)
        expect(wrapper.findAll('.ff-expert-reasoning--preview').map(n => n.text())).toEqual(['Now checking the wires', 'Planning the build.'])
    })

    test('hides the reasoning preview line while the block is expanded', async () => {
        const wrapper = mountMessage([
            { kind: 'reasoning', id: 'r1', seq: 1, text: 'Planning the build.', done: true, _uuid: 'a' }
        ])

        await wrapper.find('.ff-collapsible--header').trigger('click')
        expect(wrapper.find('.ff-expert-reasoning--preview').exists()).toBe(false)
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

    test('shows no chevron or toggle on a tool card with nothing to expand', () => {
        const wrapper = mountMessage([
            { kind: 'mcp_tool', toolTitle: 'Get flows', _uuid: 'a' },
            { kind: 'mcp_tool', toolTitle: 'List instances', reason: 'Finding the instance', _uuid: 'b' }
        ])

        const cards = wrapper.findAll('.ff-expert-timeline-item')
        expect(cards[0].find('button.ff-collapsible--header').exists()).toBe(false)
        expect(cards[0].find('.ff-collapsible--content').exists()).toBe(false)
        expect(cards[1].find('button.ff-collapsible--header').attributes('aria-expanded')).toBe('false')
        expect(cards[1].find('button.ff-collapsible--header').classes()).toContain('ff-btn--plain')
    })

    test('shows tool input and output in collapsed JSON viewers', async () => {
        const wrapper = mountMessage([
            { kind: 'mcp_tool', toolTitle: 'Get flows', input: { id: 'i1' }, output: '{"n":1}', _uuid: 'a' }
        ])

        const header = wrapper.find('button.ff-collapsible--header')
        await header.trigger('click')
        expect(header.attributes('aria-expanded')).toBe('true')

        const viewers = wrapper.findAllComponents({ name: 'JsonViewer' })
        expect(viewers.map(v => v.props('label'))).toEqual(['Input', 'Output'])
        expect(viewers[1].props('value')).toEqual({ n: 1 })
        expect(viewers.every(v => v.props('defaultCollapsed'))).toBe(true)
        expect(viewers.every(v => v.find('.json-viewer__collapse-toggle').attributes('kind') === 'plain')).toBe(true)
    })

    test('names a gateway wrapper call after the tool it invoked', () => {
        const wrapper = mountMessage([
            {
                kind: 'mcp_tool',
                toolName: 'mcp_tool__flowfuse-mcp-gateway-0__invoke_read_tool',
                toolId: 'mcp_tool__flowfuse-mcp-gateway-0__invoke_read_tool',
                input: '{"tool_name":"list_orders"}',
                _uuid: 'a'
            }
        ])

        expect(wrapper.find('.ff-expert-timeline-item--name').text()).toBe('list_orders')
    })

    describe('turn feedback', () => {
        const feedbackStubs = { ...stubs, 'turn-feedback': { name: 'TurnFeedback', template: '<div data-el="turn-feedback" />' } }

        function mountFeedback (props) {
            return mount(AiMessage, {
                props: { answer: [{ kind: 'chat', content: 'Done', _uuid: 'c', _streamed: true }], _type: 'ai', _timestamp: 1, _uuid: 'm1', _streamed: true, ...props },
                global: { stubs: feedbackStubs }
            })
        }

        test('shows the rating row only when flagged', () => {
            expect(mountFeedback({ feedback: true }).find('[data-el="turn-feedback"]').exists()).toBe(true)
            expect(mountFeedback({ feedback: false }).find('[data-el="turn-feedback"]').exists()).toBe(false)
        })

        test('waits for the answer to finish streaming', () => {
            const wrapper = mountFeedback({ feedback: true, answer: [{ kind: 'chat', content: 'Done', _uuid: 'c', _streamed: false }] })
            expect(wrapper.find('[data-el="turn-feedback"]').exists()).toBe(false)
        })

        test('is not shown on a re-rendered folded turn', () => {
            const wrapper = mountFeedback({ instant: true })
            expect(wrapper.find('[data-el="turn-feedback"]').exists()).toBe(false)
        })
    })
})
