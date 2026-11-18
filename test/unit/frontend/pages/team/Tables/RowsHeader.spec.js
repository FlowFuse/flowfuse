import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import RowsHeader from '../../../../../../frontend/src/pages/team/Tables/Table/TableExplorer/components/RowsHeader.vue'
import ForgeUIComponents from '../../../../../../frontend/src/ui-components/index.js'

const mocks = vi.hoisted(() => ({
    tablesStore: {
        tableSelection: { name: 'readings', dbSchema: 'public' },
        selectedTable: { name: 'readings', dbSchema: 'public' },
        visibleColumns: [],
        setColumnVisible: vi.fn(),
        showAllColumns: vi.fn(),
        showOriginalValues: false,
        getTableData: vi.fn(() => Promise.resolve()),
        setShowOriginalValues: vi.fn(),
        setTableLoadingState: vi.fn()
    },
    contextStore: { team: { id: 't1' } }
}))

vi.mock('@/stores/product-tables.js', () => ({ useProductTablesStore: () => mocks.tablesStore }))
vi.mock('@/stores/context.js', () => ({ useContextStore: () => mocks.contextStore }))

function mountRowsHeader () {
    return mount(RowsHeader, {
        attachTo: document.body,
        props: { menuCollapsed: false },
        global: {
            plugins: [ForgeUIComponents],
            stubs: { TextCopier: true },
            mocks: { $route: { params: { id: 'db1' } } }
        }
    })
}

describe('RowsHeader', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mocks.tablesStore.showOriginalValues = false
    })

    describe('show original values', () => {
        test('turns on when the switch is clicked', async () => {
            const wrapper = mountRowsHeader()

            await wrapper.find('[data-el="show-original-values"] .ff-toggle-switch-slider').trigger('click')

            expect(mocks.tablesStore.setShowOriginalValues).toHaveBeenCalledWith(true)
        })

        test('turns on when the words next to the switch are clicked', async () => {
            const wrapper = mountRowsHeader()

            await wrapper.find('[data-el="show-original-values"] span').trigger('click')

            expect(mocks.tablesStore.setShowOriginalValues).toHaveBeenCalledWith(true)
        })

        test('turns off again from the words when it is on', async () => {
            mocks.tablesStore.showOriginalValues = true
            const wrapper = mountRowsHeader()

            await wrapper.find('[data-el="show-original-values"] span').trigger('click')

            expect(mocks.tablesStore.setShowOriginalValues).toHaveBeenCalledWith(false)
        })
    })

    describe('visible columns', () => {
        const schema = [{ name: 'id' }, { name: 'name' }, { name: 'notes' }]
        const panel = () => document.body.querySelector('[data-el="visible-columns-panel"]')
        const checkbox = name => panel().querySelector(`[data-column="${name}"]`)
        let wrapper

        async function openColumns (visible = schema) {
            mocks.tablesStore.selectedTable = { name: 'readings', dbSchema: 'public', schema }
            mocks.tablesStore.visibleColumns = visible
            wrapper = mountRowsHeader()
            await wrapper.find('[data-el="visible-columns"] button').trigger('click')
        }

        afterEach(() => wrapper.unmount())

        test('lists every column of the table, ticked when it is showing', async () => {
            await openColumns([schema[0], schema[2]])

            expect([...panel().querySelectorAll('li')].map(item => item.textContent.trim())).toEqual(['id', 'name', 'notes'])
            expect(checkbox('id').querySelector('input').checked).toBe(true)
            expect(checkbox('name').querySelector('input').checked).toBe(false)
        })

        test('hides a column when it is unticked, and shows it when ticked', async () => {
            await openColumns([schema[0], schema[2]])

            checkbox('id').querySelector('label').click()
            expect(mocks.tablesStore.setColumnVisible).toHaveBeenLastCalledWith('id', false)

            checkbox('name').querySelector('label').click()
            expect(mocks.tablesStore.setColumnVisible).toHaveBeenLastCalledWith('name', true)
        })

        test('says how many columns are showing once some are hidden', async () => {
            await openColumns([schema[0], schema[2]])
            expect(wrapper.find('[data-el="visible-columns"] button').text()).toBe('Columns (2 of 3)')
        })

        test('says only Columns while every column is showing, with nothing to show again', async () => {
            await openColumns()
            expect(wrapper.find('[data-el="visible-columns"] button').text()).toBe('Columns')
            expect(panel().querySelector('[data-action="show-all-columns"]').disabled).toBe(true)
        })

        test('shows every column again from Show all', async () => {
            await openColumns([schema[0]])
            panel().querySelector('[data-action="show-all-columns"]').click()
            expect(mocks.tablesStore.showAllColumns).toHaveBeenCalledTimes(1)
        })

        test('does not let the last column showing be hidden', async () => {
            await openColumns([schema[2]])
            expect(checkbox('notes').querySelector('input').disabled).toBe(true)
            expect(checkbox('id').querySelector('input').disabled).toBe(false)

            checkbox('notes').querySelector('label').click()
            expect(mocks.tablesStore.setColumnVisible).not.toHaveBeenCalled()
        })
    })
})
