import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import RowsList from '../../../../../../frontend/src/pages/team/Tables/Table/TableExplorer/components/RowsList.vue'
import ForgeUIComponents from '../../../../../../frontend/src/ui-components/index.js'

const mocks = vi.hoisted(() => ({
    tablesStore: {
        tables: {},
        tableSelection: null,
        isLoading: false,
        selectedTable: null,
        page: 1,
        pageSize: 25,
        setPage: vi.fn(),
        setPageSize: vi.fn(),
        showOriginalValues: false,
        setShowOriginalValues: vi.fn(),
        setTableLoadingState: vi.fn(),
        getTableData: vi.fn(() => Promise.resolve()),
        getTableSchema: vi.fn(() => Promise.resolve()),
        updateTableSelection: vi.fn()
    },
    contextStore: { team: { id: 't1' } },
    drawersStore: { openRightDrawer: vi.fn() }
}))

vi.mock('@/stores/product-tables.js', () => ({ useProductTablesStore: () => mocks.tablesStore }))
vi.mock('@/stores/context.js', () => ({ useContextStore: () => mocks.contextStore }))
vi.mock('@/stores/ux-drawers.js', () => ({ useUxDrawersStore: () => mocks.drawersStore }))

function mountRowsList () {
    return mount(RowsList, {
        global: {
            plugins: [ForgeUIComponents],
            mocks: { $route: { params: { id: 'db1' } } }
        }
    })
}

describe('RowsList', () => {
    test('renders column names and types as text, not markup', () => {
        mocks.tablesStore.selectedTable = {
            schema: [{ name: '<img src=x onerror=alert(1)>', safeName: 'col', type: '<b>text</b>' }],
            payload: { safe: [] }
        }

        const wrapper = mount(RowsList, {
            global: {
                plugins: [ForgeUIComponents],
                mocks: { $route: { params: { id: 'db1' } } }
            }
        })

        expect(wrapper.find('img').exists()).toBe(false)
        expect(wrapper.find('thead b').exists()).toBe(false)
        expect(wrapper.find('thead').text()).toContain('<img src=x onerror=alert(1)>')
        expect(wrapper.find('thead').text()).toContain('<b>text</b>')
    })

    describe('when the database has no tables', () => {
        test('shows the empty state with a way to create the first table', async () => {
            mocks.tablesStore.selectedTable = null
            mocks.tablesStore.tables = { db1: [] }

            const wrapper = mountRowsList()

            const emptyState = wrapper.find('[data-el="no-tables"]')
            expect(emptyState.exists()).toBe(true)
            expect(emptyState.text()).toContain('No tables yet')

            await emptyState.find('[data-action="create-table"]').trigger('click')
            expect(mocks.drawersStore.openRightDrawer).toHaveBeenCalledTimes(1)
        })

        test('does not show the empty state while the tables are still loading', () => {
            mocks.tablesStore.selectedTable = null
            mocks.tablesStore.tables = {}

            expect(mountRowsList().find('[data-el="no-tables"]').exists()).toBe(false)
        })

        test('does not show the empty state when the database has tables', () => {
            mocks.tablesStore.selectedTable = null
            mocks.tablesStore.tables = { db1: [{ name: 'readings', dbSchema: 'public' }] }

            expect(mountRowsList().find('[data-el="no-tables"]').exists()).toBe(false)
        })
    })

    test('labels each column with its friendly type name, keeping the database name on hover', () => {
        mocks.tablesStore.selectedTable = {
            schema: [
                { name: 'id', safeName: 'a', type: 'int8' },
                { name: 'tags', safeName: 'b', type: '_text' },
                { name: 'search', safeName: 'c', type: 'tsvector' }
            ],
            payload: { safe: [] }
        }

        const types = mountRowsList().findAll('thead .column-type')

        expect(types.map(type => type.text())).toEqual(['Big Number', 'List of Text', 'tsvector'])
        expect(types.map(type => type.attributes('title'))).toEqual(['int8', '_text', 'tsvector'])
    })

    describe('cells', () => {
        const schema = [
            { name: 'running', safeName: 'a', type: 'bool' },
            { name: 'notes', safeName: 'b', type: 'text' }
        ]

        beforeEach(() => {
            mocks.tablesStore.showOriginalValues = false
            mocks.tablesStore.selectedTable = { schema, payload: { safe: [{ a: true, b: null }] } }
        })

        test('shows each value according to its column type', () => {
            const cells = mountRowsList().findAll('tbody [data-el="table-cell"]')
            expect(cells[0].find('.pill').text()).toBe('true')
            expect(cells[1].classes()).toContain('table-cell--empty')
            expect(cells[1].text()).toBe('empty')
        })

        test('shows the values as stored when original values are asked for', () => {
            mocks.tablesStore.showOriginalValues = true
            const cells = mountRowsList().findAll('tbody [data-el="table-cell"]')
            expect(cells[0].find('.pill').exists()).toBe(false)
            expect(cells[0].text()).toBe('true')
        })

        test('goes back to formatted values when leaving the page', () => {
            mountRowsList().unmount()
            expect(mocks.tablesStore.setShowOriginalValues).toHaveBeenCalledWith(false)
        })
    })

    describe('paging', () => {
        const schema = [{ name: 'id', safeName: 'col', type: 'bigint' }]

        beforeEach(() => {
            vi.clearAllMocks()
            mocks.tablesStore.page = 2
            mocks.tablesStore.pageSize = 25
            mocks.tablesStore.tableSelection = { name: 'readings', dbSchema: 'public' }
            mocks.tablesStore.selectedTable = { schema, payload: { safe: [{ col: 26 }], total: 1284 } }
        })

        test('shows where the current page sits in the whole table', () => {
            const wrapper = mountRowsList()
            expect(wrapper.find('[data-el="pagination"]').text()).toContain('26–50 of 1284')
        })

        test('shows no paging controls when the table fits on one page', () => {
            mocks.tablesStore.page = 1
            mocks.tablesStore.selectedTable = { schema, payload: { safe: [{ col: 1 }], total: 1 } }
            const wrapper = mountRowsList()
            expect(wrapper.find('[data-el="pagination"]').exists()).toBe(false)
        })

        test('loads the chosen page for the selected table', async () => {
            const wrapper = mountRowsList()
            await wrapper.find('[data-action="page-next"]').trigger('click')
            expect(mocks.tablesStore.setPage).toHaveBeenCalledWith(3)
            expect(mocks.tablesStore.getTableData).toHaveBeenCalledWith({ teamId: 't1', databaseId: 'db1', tableName: 'readings', schemaName: 'public' })
        })

        test('keeps showing the loading state until the most recently chosen page has loaded', async () => {
            const loads = []
            const pendingLoad = () => new Promise(resolve => loads.push(resolve))
            mocks.tablesStore.getTableData.mockImplementationOnce(pendingLoad).mockImplementationOnce(pendingLoad)
            const wrapper = mountRowsList()
            await wrapper.find('[data-action="page-next"]').trigger('click')
            await wrapper.find('[data-action="page-next"]').trigger('click')
            expect(loads).toHaveLength(2)

            loads[0]()
            await flushPromises()
            expect(mocks.tablesStore.setTableLoadingState).not.toHaveBeenCalledWith(false)

            loads[1]()
            await flushPromises()
            expect(mocks.tablesStore.setTableLoadingState).toHaveBeenLastCalledWith(false)
        })

        test('does not offer to sort by column, since only the current page is loaded', () => {
            const wrapper = mountRowsList()
            expect(wrapper.find('thead .sortable').exists()).toBe(false)
        })
    })

    describe('loading a table', () => {
        const readings = { name: 'readings', dbSchema: 'public' }
        const schema = [{ name: 'id', safeName: 'col', type: 'bigint' }]
        // the store is a plain mock, so run the table selection watcher by hand
        const selectTable = (wrapper, table) => wrapper.vm.$options.watch.tableSelection.call(wrapper.vm, table)

        beforeEach(() => {
            vi.clearAllMocks()
            mocks.tablesStore.isLoading = false
            mocks.tablesStore.tableSelection = readings
            mocks.tablesStore.selectedTable = { schema, payload: { safe: [{ col: 1 }], total: 1 } }
        })

        test('shows a loading indicator while the columns of a table are not known yet', () => {
            mocks.tablesStore.isLoading = true
            mocks.tablesStore.selectedTable = { name: 'readings' }
            const wrapper = mountRowsList()
            expect(wrapper.find('[data-el="table-loading"]').exists()).toBe(true)
            expect(wrapper.text()).not.toContain("There doesn't seem to be anything here!")
        })

        test('shows skeleton rows under the headers while the rows are loading', () => {
            mocks.tablesStore.isLoading = true
            const wrapper = mountRowsList()
            expect(wrapper.find('thead').text()).toContain('id')
            expect(wrapper.findAll('.ff-data-table--skeleton-row').length).toBeGreaterThan(0)
        })

        test('says there is nothing to show only once loading is done', () => {
            mocks.tablesStore.selectedTable = { name: 'readings' }
            const wrapper = mountRowsList()
            expect(wrapper.find('[data-el="table-loading"]').exists()).toBe(false)
            expect(wrapper.text()).toContain("There doesn't seem to be anything here!")
        })

        test('is loading from the moment a table is picked until its rows are in', async () => {
            const wrapper = mountRowsList()
            selectTable(wrapper, readings)
            expect(mocks.tablesStore.setTableLoadingState.mock.calls).toEqual([[true]])
            await flushPromises()
            expect(mocks.tablesStore.getTableSchema).toHaveBeenCalledTimes(1)
            expect(mocks.tablesStore.getTableData).toHaveBeenCalledTimes(1)
            expect(mocks.tablesStore.setTableLoadingState.mock.calls).toEqual([[true], [false]])
        })

        test('stops loading when the table fails to load', async () => {
            mocks.tablesStore.getTableSchema.mockRejectedValueOnce(new Error('nope'))
            const wrapper = mountRowsList()
            selectTable(wrapper, readings)
            await flushPromises()
            expect(mocks.tablesStore.setTableLoadingState.mock.calls).toEqual([[true], [false]])
        })

        test('stays loading when another table was picked before this one finished', async () => {
            const wrapper = mountRowsList()
            selectTable(wrapper, { name: 'orders', dbSchema: 'public' })
            await flushPromises()
            expect(mocks.tablesStore.setTableLoadingState.mock.calls).toEqual([[true]])
        })
    })
})
