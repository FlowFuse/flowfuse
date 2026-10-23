import { createTestingPinia } from '@pinia/testing'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, test, vi } from 'vitest'

import * as Mermaid from '../../../../../frontend/src/composables/strings/Mermaid.js'

vi.mock('../../../../../frontend/src/composables/strings/Mermaid.js', async (importOriginal) => {
    const original = await importOriginal()
    return {
        ...original,
        sanitizeDiagram: vi.fn(original.sanitizeDiagram),
        svgToPngBlob: vi.fn(async () => new Blob(['png'], { type: 'image/png' }))
    }
})

const StreamableContent = (await import('../../../../../frontend/src/components/expert/components/messages/components/resources/StreamableContent.vue')).default

const source = 'flowchart LR\n  A[Start] --> B[End]'
const content = '```mermaid\n' + source + '\n```\n\nDone.'
const diagrams = [{ source, svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10"></rect></svg>' }]

function mountContent ({ shouldStream, diagrams }) {
    return mount(StreamableContent, {
        props: { string: content, richContent: true, shouldStream, diagrams },
        global: { plugins: [createTestingPinia({ createSpy: vi.fn })] }
    })
}

describe('StreamableContent mermaid diagrams', () => {
    afterEach(() => {
        vi.useRealTimers()
        vi.clearAllMocks()
        vi.unstubAllGlobals()
    })

    test('shows the diagram the Expert rendered', async () => {
        const wrapper = mountContent({ shouldStream: false, diagrams })
        await flushPromises()
        const block = wrapper.element.querySelector('.ff-code-block--mermaid')
        expect(block.getAttribute('data-mermaid-state')).toBe('rendered')
        expect(block.querySelector('.ff-code-block--diagram svg')).not.toBeNull()
        expect(block.querySelector('pre').hidden).toBe(true)
        expect(block.querySelectorAll('.ff-code-block--export')).toHaveLength(3)
    })

    test('switches between the diagram and its code', async () => {
        const wrapper = mountContent({ shouldStream: false, diagrams })
        await flushPromises()
        const block = wrapper.element.querySelector('.ff-code-block--mermaid')
        block.querySelector('.ff-code-block--toggle').click()
        expect(block.querySelector('pre').hidden).toBe(false)
        expect(block.querySelector('.ff-code-block--diagram').hidden).toBe(true)
        block.querySelector('.ff-code-block--toggle').click()
        expect(block.querySelector('pre').hidden).toBe(true)
        expect(block.querySelector('.ff-code-block--diagram').hidden).toBe(false)
    })

    test('shows the diagram while streaming and keeps the code indentation', async () => {
        vi.useFakeTimers()
        const wrapper = mountContent({ shouldStream: true, diagrams })
        await vi.advanceTimersByTimeAsync(5000)
        await flushPromises()
        const block = wrapper.element.querySelector('.ff-code-block--mermaid')
        expect(block.getAttribute('data-mermaid-state')).toBe('rendered')
        expect(block.querySelector('pre code').textContent).toBe(source)
    })

    test('sanitizes each diagram once while streaming', async () => {
        vi.useFakeTimers()
        mountContent({ shouldStream: true, diagrams })
        await vi.advanceTimersByTimeAsync(5000)
        await flushPromises()
        expect(Mermaid.sanitizeDiagram).toHaveBeenCalledTimes(1)
    })

    test('copies the SVG with the theme colours of the page', async () => {
        const writeText = vi.fn()
        vi.stubGlobal('navigator', { clipboard: { writeText } })
        const wrapper = mountContent({ shouldStream: false, diagrams })
        await flushPromises()
        const block = wrapper.element.querySelector('.ff-code-block--mermaid')
        block.querySelector('.ff-code-block--diagram').style.setProperty('--pele-bg', '#101010')
        block.querySelector('[data-export="svg"]').click()
        await flushPromises()
        expect(writeText).toHaveBeenCalledTimes(1)
        expect(writeText.mock.calls[0][0]).toContain('--pele-bg: #101010')
    })

    test('revokes the PNG download URL only after the download has started', async () => {
        vi.useFakeTimers()
        const createObjectURL = vi.fn(() => 'blob:diagram')
        const revokeObjectURL = vi.fn()
        vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL })
        const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
        const wrapper = mountContent({ shouldStream: false, diagrams })
        await flushPromises()
        wrapper.element.querySelector('[data-export="png"]').click()
        await flushPromises()
        expect(click).toHaveBeenCalledTimes(1)
        expect(revokeObjectURL).not.toHaveBeenCalled()
        await vi.advanceTimersByTimeAsync(40 * 1000)
        expect(revokeObjectURL).toHaveBeenCalledWith('blob:diagram')
        click.mockRestore()
    })

    test('keeps the source when there is no diagram for the block', async () => {
        const wrapper = mountContent({ shouldStream: false, diagrams: [] })
        await flushPromises()
        const block = wrapper.element.querySelector('.ff-code-block--mermaid')
        expect(block.getAttribute('data-mermaid-state')).toBe('failed')
        expect(block.querySelector('.ff-code-block--toggle')).toBeNull()
    })
})
