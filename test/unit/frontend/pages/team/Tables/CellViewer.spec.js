import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, test } from 'vitest'

import TableCell from '../../../../../../frontend/src/pages/team/Tables/Table/TableExplorer/components/TableCell.vue'

const viewer = () => document.body.querySelector('[data-el="cell-viewer"]')
const viewerPart = part => viewer().querySelector(`[data-el="cell-viewer-${part}"]`).textContent
const copyButton = () => viewer().querySelector('[data-action="copy-cell-value"]')

let wrappers = []
const mountCell = (props) => {
    const wrapper = mount(TableCell, { props, attachTo: document.body })
    wrappers.push(wrapper)
    return wrapper.find('[data-el="table-cell"]')
}

describe('CellViewer', () => {
    afterEach(() => {
        wrappers.forEach(wrapper => wrapper.unmount())
        wrappers = []
    })

    test('is closed until a cell is clicked', async () => {
        const cell = mountCell({ name: 'notes', value: 'Routine reading', type: 'text' })
        expect(viewer()).toBeNull()

        await cell.trigger('click')
        expect(viewer()).not.toBeNull()
    })

    test('names the column and its type', async () => {
        await mountCell({ name: 'payload', value: { a: 1 }, type: 'jsonb' }).trigger('click')
        expect(viewerPart('column')).toBe('payload')
        expect(viewerPart('type')).toBe('JSON')
    })

    test('shows the whole of a long piece of text, line breaks included', async () => {
        const value = `${'a long note '.repeat(100)}\nand a second line`
        await mountCell({ name: 'notes', value, type: 'text' }).trigger('click')
        expect(viewerPart('value')).toBe(value)
    })

    test('lays JSON out over several lines', async () => {
        await mountCell({ name: 'payload', value: { unit: 'C', readings: [1, 2] }, type: 'jsonb' }).trigger('click')
        expect(viewerPart('value')).toBe('{\n  "unit": "C",\n  "readings": [\n    1,\n    2\n  ]\n}')
    })

    test('shows text holding markup as text', async () => {
        await mountCell({ name: 'notes', value: '<img src=x onerror=alert(1)>', type: 'text' }).trigger('click')
        expect(viewer().querySelector('img')).toBeNull()
        expect(viewerPart('value')).toBe('<img src=x onerror=alert(1)>')
    })

    test('opens for an empty value, with nothing to copy', async () => {
        await mountCell({ name: 'notes', value: null, type: 'text' }).trigger('click')
        expect(viewerPart('value')).toBe('empty')
        expect(copyButton()).toBeNull()
    })

    test('says when only the start of a binary value is available', async () => {
        await mountCell({ name: 'file', value: { bytes: 400, hex: 'ab'.repeat(32) }, type: 'bytea' }).trigger('click')
        expect(viewerPart('note')).toBe('Only the first 32 bytes are shown')
    })

    test('shows the value as stored when asked for original values', async () => {
        await mountCell({ name: 'day', value: '2025-08-01', type: 'date', showOriginal: true }).trigger('click')
        expect(viewerPart('value')).toBe('2025-08-01')
    })

    describe('closing', () => {
        test('closes on a second click on the cell', async () => {
            const cell = mountCell({ name: 'notes', value: 'a', type: 'text' })
            await cell.trigger('click')
            await cell.trigger('click')
            expect(viewer()).toBeNull()
        })

        test('closes on Escape', async () => {
            const cell = mountCell({ name: 'notes', value: 'a', type: 'text' })
            await cell.trigger('click')
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
            await wrappers[0].vm.$nextTick()
            expect(viewer()).toBeNull()
        })

        test('closes on a click outside, and stays open on a click inside', async () => {
            const cell = mountCell({ name: 'notes', value: 'a', type: 'text' })
            await cell.trigger('click')

            viewer().querySelector('[data-el="cell-viewer-value"]').click()
            await wrappers[0].vm.$nextTick()
            expect(viewer()).not.toBeNull()

            document.body.click()
            await wrappers[0].vm.$nextTick()
            expect(viewer()).toBeNull()
        })

        test('opening another cell closes the first', async () => {
            const first = mountCell({ name: 'notes', value: 'first', type: 'text' })
            const second = mountCell({ name: 'notes', value: 'second', type: 'text' })
            await first.trigger('click')
            await second.trigger('click')
            await wrappers[0].vm.$nextTick()

            expect(document.body.querySelectorAll('[data-el="cell-viewer"]')).toHaveLength(1)
            expect(viewerPart('value')).toBe('second')
        })

        test('closes when the grid scrolls, but not when a long value scrolls inside it', async () => {
            const cell = mountCell({ name: 'notes', value: 'a', type: 'text' })
            await cell.trigger('click')

            viewer().querySelector('[data-el="cell-viewer-value"]').dispatchEvent(new Event('scroll'))
            await wrappers[0].vm.$nextTick()
            expect(viewer()).not.toBeNull()

            document.body.dispatchEvent(new Event('scroll'))
            await wrappers[0].vm.$nextTick()
            expect(viewer()).toBeNull()
        })
    })

    describe('copy', () => {
        const copied = async (props) => {
            let text
            Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (value) => { text = value } } })
            await mountCell(props).trigger('click')
            copyButton().querySelector('button').click()
            await wrappers[0].vm.$nextTick()
            return text
        }

        test('copies a date as it is stored, not as it is shown', async () => {
            expect(await copied({ name: 'day', value: '2025-08-01', type: 'date' })).toBe('2025-08-01')
        })

        test('copies JSON laid out over several lines', async () => {
            expect(await copied({ name: 'payload', value: { a: 1 }, type: 'jsonb' })).toBe('{\n  "a": 1\n}')
        })

        test('copies the bytes of a binary value', async () => {
            expect(await copied({ name: 'file', value: { bytes: 2, hex: 'abcd' }, type: 'bytea' })).toBe('abcd')
        })
    })
})
