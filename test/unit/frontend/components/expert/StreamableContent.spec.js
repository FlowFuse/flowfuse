import { createTestingPinia } from '@pinia/testing'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, test, vi } from 'vitest'

const StreamableContent = (await import('../../../../../frontend/src/components/expert/components/messages/components/resources/StreamableContent.vue')).default

const source = 'flowchart LR\n  A[Start] --> B[End]'
const content = '```mermaid\n' + source + '\n```\n\nDone.'
const diagrams = [{ source, svg: '<svg viewBox="0 0 10 10"><rect width="10" height="10"></rect></svg>' }]

function mountContent ({ shouldStream, diagrams }) {
    return mount(StreamableContent, {
        props: { string: content, richContent: true, shouldStream, diagrams },
        global: { plugins: [createTestingPinia({ createSpy: vi.fn })] }
    })
}

describe('StreamableContent mermaid diagrams', () => {
    afterEach(() => {
        vi.useRealTimers()
    })

    test('shows the diagram the Expert rendered', async () => {
        const wrapper = mountContent({ shouldStream: false, diagrams })
        await flushPromises()
        const block = wrapper.element.querySelector('.ff-code-block--mermaid')
        expect(block.getAttribute('data-mermaid-state')).toBe('rendered')
        expect(block.querySelector('.ff-code-block--diagram svg')).not.toBeNull()
    })

    test('shows the diagram while streaming, which collapses the code indentation', async () => {
        vi.useFakeTimers()
        const wrapper = mountContent({ shouldStream: true, diagrams })
        await vi.advanceTimersByTimeAsync(5000)
        await flushPromises()
        const block = wrapper.element.querySelector('.ff-code-block--mermaid')
        expect(block.getAttribute('data-mermaid-state')).toBe('rendered')
    })

    test('keeps the source when there is no diagram for the block', async () => {
        const wrapper = mountContent({ shouldStream: false, diagrams: [] })
        await flushPromises()
        const block = wrapper.element.querySelector('.ff-code-block--mermaid')
        expect(block.getAttribute('data-mermaid-state')).toBe('failed')
    })
})
