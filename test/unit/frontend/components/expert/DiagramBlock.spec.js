import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import FFUIComponents from '../../../../../frontend/src/ui-components/index.js'

vi.mock('../../../../../frontend/src/composables/strings/Diagram.js', async (importOriginal) => {
    const original = await importOriginal()
    return {
        ...original,
        svgToPngBlob: vi.fn(async () => new Blob(['png'], { type: 'image/png' }))
    }
})

vi.mock('../../../../../frontend/src/services/alerts.js', () => ({
    default: { emit: vi.fn() }
}))

const DiagramBlock = (await import('../../../../../frontend/src/components/expert/components/messages/components/resources/DiagramBlock.vue')).default
const Alerts = (await import('../../../../../frontend/src/services/alerts.js')).default

const source = 'flowchart LR\n  A[Start] --> B[End]'
const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10"></rect></svg>'

function mountDiagram () {
    return mount(DiagramBlock, {
        props: { type: 'mermaid', source, svg },
        global: { plugins: [FFUIComponents] },
        attachTo: document.body
    })
}

async function clickMenuItem (wrapper, label) {
    await wrapper.find('[data-el="diagram-export"] .ff-kebab-menu__trigger').trigger('click')
    await flushPromises()
    document.body.querySelector(`[data-el="kebab-item-${label}"]`).click()
    await flushPromises()
}

describe('DiagramBlock', () => {
    let writeText

    beforeEach(() => {
        writeText = vi.fn(async () => {})
        vi.stubGlobal('navigator', { clipboard: { writeText } })
    })

    afterEach(() => {
        vi.useRealTimers()
        vi.clearAllMocks()
        vi.unstubAllGlobals()
        document.body.innerHTML = ''
    })

    test('switches between the diagram and its code', async () => {
        const wrapper = mountDiagram()
        const toggle = wrapper.find('[data-action="toggle-code"]')
        expect(wrapper.find('.ff-diagram-block--svg').isVisible()).toBe(true)
        expect(wrapper.find('pre').isVisible()).toBe(false)
        await toggle.trigger('click')
        expect(wrapper.find('pre').isVisible()).toBe(true)
        expect(wrapper.find('.ff-diagram-block--svg').isVisible()).toBe(false)
        expect(toggle.attributes('aria-pressed')).toBe('true')
        expect(wrapper.find('pre code').text()).toBe(source)
        await toggle.trigger('click')
        expect(wrapper.find('.ff-diagram-block--svg').isVisible()).toBe(true)
        expect(toggle.attributes('aria-pressed')).toBe('false')
    })

    test('copies the source and goes back to the copy icon after repeated clicks', async () => {
        vi.useFakeTimers()
        const wrapper = mountDiagram()
        const copy = wrapper.find('.ff-code-block--copy')
        const icon = copy.html()
        await copy.trigger('click')
        await flushPromises()
        await vi.advanceTimersByTimeAsync(1000)
        await copy.trigger('click')
        await flushPromises()
        expect(writeText).toHaveBeenCalledWith(source)
        expect(copy.html()).not.toBe(icon)
        await vi.advanceTimersByTimeAsync(2000)
        expect(copy.html()).toBe(icon)
    })

    test('copies the SVG with the theme colours of the page', async () => {
        const wrapper = mountDiagram()
        wrapper.find('.ff-diagram-block--svg').element.style.setProperty('--pele-bg', '#101010')
        await clickMenuItem(wrapper, 'copy-svg')
        expect(writeText).toHaveBeenCalledTimes(1)
        expect(writeText.mock.calls[0][0]).toContain('--pele-bg: #101010')
        expect(Alerts.emit).toHaveBeenCalledWith('Copied to Clipboard.', 'confirmation')
    })

    test('copies the diagram as an image', async () => {
        const write = vi.fn(async () => {})
        vi.stubGlobal('navigator', { clipboard: { writeText, write } })
        vi.stubGlobal('ClipboardItem', class { constructor (items) { this.items = items } })
        const wrapper = mountDiagram()
        await clickMenuItem(wrapper, 'copy-image')
        expect(write).toHaveBeenCalledTimes(1)
        expect(Object.keys(write.mock.calls[0][0][0].items)).toEqual(['image/png'])
        expect(Alerts.emit).toHaveBeenCalledWith('Copied to Clipboard.', 'confirmation')
    })

    test('revokes the PNG download URL only after the download has started', async () => {
        const createObjectURL = vi.fn(() => 'blob:diagram')
        const revokeObjectURL = vi.fn()
        vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL })
        const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
        const wrapper = mountDiagram()
        await clickMenuItem(wrapper, 'download-png')
        expect(click).toHaveBeenCalledTimes(1)
        expect(revokeObjectURL).not.toHaveBeenCalled()
        await vi.advanceTimersByTimeAsync(40 * 1000)
        expect(revokeObjectURL).toHaveBeenCalledWith('blob:diagram')
        click.mockRestore()
    })
})
