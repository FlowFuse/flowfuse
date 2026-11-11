import { mount } from '@vue/test-utils'
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

        test('does not offer to sort by column, since only the current page is loaded', () => {
            const wrapper = mountRowsList()
            expect(wrapper.find('thead .sortable').exists()).toBe(false)
        })
    })
})
