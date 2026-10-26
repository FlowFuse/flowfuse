import { createTestingPinia } from '@pinia/testing'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, test, vi } from 'vitest'

import DiagramBlock from '../../../../../frontend/src/components/expert/components/messages/components/resources/DiagramBlock.vue'
import * as Diagram from '../../../../../frontend/src/composables/strings/Diagram.js'
import FFUIComponents from '../../../../../frontend/src/ui-components/index.js'

vi.mock('../../../../../frontend/src/composables/strings/Diagram.js', async (importOriginal) => {
    const original = await importOriginal()
    return {
        ...original,
        sanitizeDiagram: vi.fn(original.sanitizeDiagram)
    }
})

const StreamableContent = (await import('../../../../../frontend/src/components/expert/components/messages/components/resources/StreamableContent.vue')).default

const source = 'flowchart LR\n  A[Start] --> B[End]'
const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10"></rect></svg>'
const content = 'Here is the flow you asked for.\n\n```mermaid\n' + source + '\n```\n\nIt starts at Start and ends at End, with nothing else in between.'
const diagrams = [{ type: 'mermaid', source, svg }]

function mountContent ({ shouldStream = false, diagrams = [], string = content } = {}) {
    return mount(StreamableContent, {
        props: { string, richContent: true, shouldStream, diagrams },
        global: { plugins: [createTestingPinia({ createSpy: vi.fn }), FFUIComponents] }
    })
}

describe('StreamableContent diagrams', () => {
    afterEach(() => {
        vi.useRealTimers()
        vi.clearAllMocks()
    })

    test('shows the diagram the Expert rendered in place of its code block', async () => {
        const wrapper = mountContent({ diagrams })
        await flushPromises()
        const diagram = wrapper.findComponent(DiagramBlock)
        expect(diagram.exists()).toBe(true)
        expect(diagram.props()).toMatchObject({ type: 'mermaid', source })
        expect(diagram.find('svg rect').exists()).toBe(true)
        expect(wrapper.text()).toContain('Here is the flow you asked for.')
        expect(wrapper.text()).toContain('nothing else in between')
    })

    test('keeps the code block when there is no diagram for it', async () => {
        const wrapper = mountContent()
        await flushPromises()
        expect(wrapper.findComponent(DiagramBlock).exists()).toBe(false)
        expect(wrapper.element.querySelector('.ff-code-block pre code').textContent).toBe(source)
    })

    test('matches a diagram by its type as well as its source', async () => {
        const wrapper = mountContent({ diagrams: [{ type: 'other', source, svg }] })
        await flushPromises()
        expect(wrapper.findComponent(DiagramBlock).exists()).toBe(false)
    })

    test('treats diagrams without a type as mermaid', async () => {
        const wrapper = mountContent({ diagrams: [{ source, svg }] })
        await flushPromises()
        expect(wrapper.findComponent(DiagramBlock).exists()).toBe(true)
    })

    test('shows the diagram once the text before it has streamed, and keeps it while the rest streams', async () => {
        vi.useFakeTimers()
        const wrapper = mountContent({ shouldStream: true, diagrams })
        await vi.advanceTimersByTimeAsync(20)
        expect(wrapper.findComponent(DiagramBlock).exists()).toBe(true)
        expect(wrapper.text()).not.toContain('nothing else in between')
        const rendered = wrapper.findComponent(DiagramBlock).element
        await vi.advanceTimersByTimeAsync(5000)
        expect(wrapper.text()).toContain('nothing else in between')
        expect(wrapper.findComponent(DiagramBlock).element).toBe(rendered)
        expect(wrapper.emitted('streaming-complete')).toHaveLength(1)
    })

    test('lets the diagram buttons work while the message streams', async () => {
        vi.useFakeTimers()
        const wrapper = mountContent({ shouldStream: true, diagrams })
        await vi.advanceTimersByTimeAsync(20)
        await wrapper.find('[data-action="toggle-code"]').trigger('click')
        await vi.advanceTimersByTimeAsync(20)
        expect(wrapper.text()).not.toContain('nothing else in between')
        expect(wrapper.find('.ff-diagram-block pre').isVisible()).toBe(true)
    })

    test('sanitizes each diagram once while streaming', async () => {
        vi.useFakeTimers()
        mountContent({ shouldStream: true, diagrams })
        await vi.advanceTimersByTimeAsync(5000)
        expect(Diagram.sanitizeDiagram).toHaveBeenCalledTimes(1)
    })

    test('keeps the code indentation while streaming', async () => {
        vi.useFakeTimers()
        const yaml = 'root:\n    child:\n        leaf: true'
        const wrapper = mountContent({ shouldStream: true, string: 'Config:\n\n```yaml\n' + yaml + '\n```' })
        await vi.advanceTimersByTimeAsync(5000)
        expect(wrapper.element.querySelector('pre code').textContent).toBe(yaml)
    })
})
