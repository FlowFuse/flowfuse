import { mount } from '@vue/test-utils'
import { describe, expect, test } from 'vitest'

import TableCell from '../../../../../../frontend/src/pages/team/Tables/Table/TableExplorer/components/TableCell.vue'

const mountCell = props => mount(TableCell, { props }).find('[data-el="table-cell"]')

describe('TableCell', () => {
    test('shows true and false as pills', () => {
        const cell = mountCell({ value: true, type: 'bool' })
        expect(cell.find('.pill.pill--true').text()).toBe('true')
        expect(mountCell({ value: false, type: 'bool' }).find('.pill.pill--false').text()).toBe('false')
    })

    test('marks the kind of value so each one can be styled', () => {
        expect(mountCell({ value: 12, type: 'int4' }).classes()).toContain('table-cell--number')
        expect(mountCell({ value: null, type: 'int4' }).classes()).toContain('table-cell--empty')
        expect(mountCell({ value: { a: 1 }, type: 'jsonb' }).classes()).toContain('table-cell--json')
    })

    test('keeps the value as stored on hover', () => {
        const cell = mountCell({ value: '2025-08-01', type: 'date' })
        expect(cell.attributes('title')).toBe('2025-08-01')
        expect(cell.text()).not.toBe('2025-08-01')
    })

    test('has nothing to show on hover for an empty value', () => {
        expect(mountCell({ value: null, type: 'text' }).attributes('title')).toBeUndefined()
    })

    test('shows text holding markup as text', () => {
        const cell = mountCell({ value: '<img src=x onerror=alert(1)>', type: 'text' })
        expect(cell.find('img').exists()).toBe(false)
        expect(cell.text()).toBe('<img src=x onerror=alert(1)>')
    })

    test('shows the value as stored, without a pill, when asked for original values', () => {
        const cell = mountCell({ value: true, type: 'bool', showOriginal: true })
        expect(cell.find('.pill').exists()).toBe(false)
        expect(cell.text()).toBe('true')
    })
})
