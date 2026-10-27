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

    test('does not break when there are no diagrams', async () => {
        const wrapper = mountContent({ diagrams: null })
        await flushPromises()
        expect(wrapper.findComponent(DiagramBlock).exists()).toBe(false)
        expect(wrapper.element.querySelector('.ff-code-block pre code').textContent).toBe(source)
    })

    test('shows a diagram inside a list item and keeps the numbering and the text around it', async () => {
        const string = '3. First step\n\n   ```mermaid\n   ' + source.replace(/\n/g, '\n   ') + '\n   ```\n\n   Then check it.\n4. Second step'
        // The Expert takes the source with the list indentation
        const wrapper = mountContent({ string, diagrams: [{ type: 'mermaid', source: source.replace(/\n/g, '\n   '), svg }] })
        await flushPromises()
        const list = wrapper.find('ol')
        expect(list.attributes('start')).toBe('3')
        const items = list.findAll(':scope > li')
        expect(items).toHaveLength(2)
        expect(items[0].findComponent(DiagramBlock).exists()).toBe(true)
        expect(items[0].text()).toContain('First step')
        expect(items[0].text()).toContain('Then check it.')
        expect(items[1].text()).toBe('Second step')
    })

    test('shows a diagram inside a nested list', async () => {
        const string = '- Outer\n  - Inner\n\n    ```mermaid\n    ' + source + '\n    ```\n- Last'
        const wrapper = mountContent({ string, diagrams })
        await flushPromises()
        const inner = wrapper.find('ul > li > ul > li')
        expect(inner.findComponent(DiagramBlock).exists()).toBe(true)
        expect(inner.text()).toContain('Inner')
        expect(wrapper.find('ul').findAll(':scope > li')).toHaveLength(2)
    })

    test('keeps the checkboxes of a task list that holds a diagram', async () => {
        const string = '- [x] Done\n- [ ] To do\n\n  ```mermaid\n  ' + source + '\n  ```'
        const wrapper = mountContent({ string, diagrams })
        await flushPromises()
        const list = wrapper.find('ul.ff-task-list')
        expect(list.exists()).toBe(true)
        expect(list.findAll('.ff-checkbox')).toHaveLength(2)
        expect(list.find('.ff-checkbox--checked').exists()).toBe(true)
        expect(list.findComponent(DiagramBlock).exists()).toBe(true)
    })

    test('shows a diagram inside a blockquote', async () => {
        const string = '> Note:\n>\n> ```mermaid\n> ' + source.replace(/\n/g, '\n> ') + '\n> ```'
        const wrapper = mountContent({ string, diagrams })
        await flushPromises()
        const quote = wrapper.find('blockquote')
        expect(quote.findComponent(DiagramBlock).exists()).toBe(true)
        expect(quote.text()).toContain('Note:')
    })

    test('renders a list without diagrams as markdown', async () => {
        const string = '1. First\n2. Second\n\n```mermaid\n' + source + '\n```'
        const wrapper = mountContent({ string, diagrams })
        await flushPromises()
        // A list built by the component would not sit inside the markdown wrapper
        expect(wrapper.find('.streamable-content > div > ol').exists()).toBe(true)
    })

    test('shows a list that holds a diagram once the text before it has streamed', async () => {
        vi.useFakeTimers()
        const intro = 'Follow these steps to build the flow, one after the other, in the order shown here.'
        const string = intro + '\n\n1. First step\n\n   ```mermaid\n   ' + source + '\n   ```\n2. Second step\n\nThat is all there is to it.'
        const wrapper = mountContent({ shouldStream: true, string, diagrams })
        await vi.advanceTimersByTimeAsync(10)
        expect(wrapper.find('ol').exists()).toBe(false)
        await vi.advanceTimersByTimeAsync(5000)
        expect(wrapper.find('ol').findComponent(DiagramBlock).exists()).toBe(true)
        expect(wrapper.text()).toContain('Second step')
        expect(wrapper.text()).toContain('That is all there is to it.')
        expect(wrapper.emitted('streaming-complete')).toHaveLength(1)
    })

    test('keeps the code indentation while streaming', async () => {
        vi.useFakeTimers()
        const yaml = 'root:\n    child:\n        leaf: true'
        const wrapper = mountContent({ shouldStream: true, string: 'Config:\n\n```yaml\n' + yaml + '\n```' })
        await vi.advanceTimersByTimeAsync(5000)
        expect(wrapper.element.querySelector('pre code').textContent).toBe(yaml)
    })
})
