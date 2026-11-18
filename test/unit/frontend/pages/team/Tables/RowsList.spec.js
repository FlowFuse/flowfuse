import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

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
        setSort: vi.fn(),
        setTableLoadingState: vi.fn(),
        getTableData: vi.fn(() => Promise.resolve()),
        getTableSchema: vi.fn(() => Promise.resolve()),
        updateTableSelection: vi.fn()
    },
    contextStore: { team: { id: 't1' }, teamMembership: { role: 50 } },
    drawersStore: { openRightDrawer: vi.fn() },
    alerts: { emit: vi.fn() }
}))

vi.mock('@/stores/product-tables.js', () => ({ useProductTablesStore: () => mocks.tablesStore }))
vi.mock('@/stores/context.js', () => ({ useContextStore: () => mocks.contextStore }))
vi.mock('@/stores/ux-drawers.js', () => ({ useUxDrawersStore: () => mocks.drawersStore }))
vi.mock('@/services/alerts.js', () => ({ default: mocks.alerts }))

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
        beforeEach(() => {
            mocks.contextStore.teamMembership = { role: 50 }
        })

        test('does not offer a member a way to create the first table', () => {
            mocks.contextStore.teamMembership = { role: 30 }
            mocks.tablesStore.selectedTable = null
            mocks.tablesStore.tables = { db1: [] }

            const emptyState = mountRowsList().find('[data-el="no-tables"]')

            expect(emptyState.text()).toContain('No tables yet')
            expect(emptyState.text()).toContain('Once a team owner creates a table')
            expect(emptyState.find('[data-action="create-table"]').exists()).toBe(false)
        })

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

        describe('keyboard', () => {
            const rows = [{ a: true, b: 'one' }, { a: false, b: 'two' }]
            let wrapper, cells
            const press = (cell, key) => cell.trigger('keydown', { key })
            const focused = () => cells.findIndex(cell => cell.element === document.activeElement)

            beforeEach(() => {
                mocks.tablesStore.selectedTable = { schema, payload: { safe: rows } }
                wrapper = mount(RowsList, {
                    attachTo: document.body,
                    global: { plugins: [ForgeUIComponents], mocks: { $route: { params: { id: 'db1' } } } }
                })
                cells = wrapper.findAll('tbody [data-el="table-cell"]')
            })

            afterEach(() => wrapper.unmount())

            test('is a single stop for the Tab key, which hands focus to the first cell', async () => {
                const grid = wrapper.find('[data-el="rows-grid"]')
                expect(grid.attributes('tabindex')).toBe('0')
                expect(cells.map(cell => cell.attributes('tabindex'))).toEqual(['-1', '-1', '-1', '-1'])

                grid.element.matches = selector => selector === ':focus-visible'
                grid.element.focus()
                await wrapper.vm.$nextTick()

                expect(focused()).toBe(0)
                expect(grid.attributes('tabindex')).toBe('-1')
                expect(cells.map(cell => cell.attributes('tabindex'))).toEqual(['0', '-1', '-1', '-1'])
            })

            test('does not jump to the first cell when the grid is clicked', () => {
                const grid = wrapper.find('[data-el="rows-grid"]')
                grid.element.matches = () => false
                grid.element.focus()
                expect(focused()).toBe(-1)
            })

            test('comes back to the cell that last had focus', async () => {
                cells[3].element.focus()
                await wrapper.vm.$nextTick()
                cells[3].element.blur()
                await wrapper.vm.$nextTick()
                expect(cells.map(cell => cell.attributes('tabindex'))).toEqual(['-1', '-1', '-1', '0'])
            })

            test('moves between cells with the arrow keys', async () => {
                cells[0].element.focus()
                await press(cells[0], 'ArrowRight')
                expect(focused()).toBe(1)
                await press(cells[1], 'ArrowDown')
                expect(focused()).toBe(3)
                await press(cells[3], 'ArrowLeft')
                expect(focused()).toBe(2)
                await press(cells[2], 'ArrowUp')
                expect(focused()).toBe(0)
            })

            test('stays put at the edges of the grid', async () => {
                cells[0].element.focus()
                await press(cells[0], 'ArrowLeft')
                await press(cells[0], 'ArrowUp')
                expect(focused()).toBe(0)
                cells[3].element.focus()
                await press(cells[3], 'ArrowRight')
                await press(cells[3], 'ArrowDown')
                expect(focused()).toBe(3)
            })

            test('jumps to the start and the end of the row with Home and End', async () => {
                cells[2].element.focus()
                await press(cells[2], 'End')
                expect(focused()).toBe(3)
                await press(cells[3], 'Home')
                expect(focused()).toBe(2)
            })
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

        describe('sorting', () => {
            const sortable = [
                { name: 'recorded at', safeName: 'a', type: 'timestamptz' },
                { name: 'payload', safeName: 'b', type: 'jsonb' },
                { name: 'tags', safeName: 'c', type: '_text' }
            ]
            // rows in an order no sort on the page would leave them in
            const rows = [{ a: '2025-01-02T00:00:00Z' }, { a: '2025-01-03T00:00:00Z' }, { a: '2025-01-01T00:00:00Z' }]
            const headers = wrapper => wrapper.findAll('thead .ff-data-table--cell')
            const firstColumn = wrapper => wrapper.findAll('tbody tr').map(row => row.find('[data-el="table-cell"]').attributes('title'))

            beforeEach(() => {
                mocks.tablesStore.page = 1
                mocks.tablesStore.selectedTable = { name: 'readings', dbSchema: 'public', schema: sortable, payload: { safe: rows, total: 3 } }
            })

            test('offers sorting on the columns that can be put in order, and not on JSON or lists', () => {
                const classes = headers(mountRowsList()).map(header => header.classes().includes('sortable'))
                expect(classes).toEqual([true, false, false])
            })

            describe('on a table too big to show in full', () => {
                const columns = [
                    { name: 'id', safeName: 'a', type: 'int8' },
                    { name: 'recorded at', safeName: 'b', type: 'timestamptz' }
                ]
                const bigTable = primaryKey => ({ name: 'readings', dbSchema: 'public', schema: columns, payload: { safe: rows, total: 10000, totalCapped: true, primaryKey } })

                test('offers sorting on the primary key only, and says so', () => {
                    mocks.tablesStore.selectedTable = bigTable(['id'])
                    const wrapper = mountRowsList()
                    expect(headers(wrapper).map(header => header.classes().includes('sortable'))).toEqual([true, false])
                    expect(wrapper.find('[data-el="table-too-big"]').text()).toContain('It can only be sorted by id.')
                })

                test('offers no sorting when the table has no primary key, and says so', () => {
                    mocks.tablesStore.selectedTable = bigTable([])
                    const wrapper = mountRowsList()
                    expect(wrapper.find('thead .sortable').exists()).toBe(false)
                    expect(wrapper.find('[data-el="table-too-big"]').text()).toContain('It cannot be sorted.')
                })
            })

            test('asks for the whole table sorted by the clicked column, by its real name', async () => {
                const wrapper = mountRowsList()
                await headers(wrapper)[0].trigger('click')
                expect(mocks.tablesStore.setSort).toHaveBeenLastCalledWith({ column: 'recorded at', dir: 'desc' })
                expect(mocks.tablesStore.getTableData).toHaveBeenCalledTimes(1)
            })

            test('turns the sort around on a second click, and clears it on a third', async () => {
                const wrapper = mountRowsList()
                await headers(wrapper)[0].trigger('click')
                await headers(wrapper)[0].trigger('click')
                expect(mocks.tablesStore.setSort).toHaveBeenLastCalledWith({ column: 'recorded at', dir: 'asc' })

                await headers(wrapper)[0].trigger('click')
                expect(mocks.tablesStore.setSort).toHaveBeenLastCalledWith(null)
                expect(mocks.tablesStore.getTableData).toHaveBeenCalledTimes(3)
            })

            test('does nothing when a column that cannot be sorted is clicked', async () => {
                const wrapper = mountRowsList()
                await headers(wrapper)[1].trigger('click')
                expect(mocks.tablesStore.setSort).not.toHaveBeenCalled()
                expect(mocks.tablesStore.getTableData).not.toHaveBeenCalled()
            })

            test('shows the rows in the order they arrive, without sorting the page itself', async () => {
                const wrapper = mountRowsList()
                await headers(wrapper)[0].trigger('click')
                expect(firstColumn(wrapper)).toEqual(rows.map(row => row.a))
            })

            test('says why when the table cannot be sorted that way', async () => {
                mocks.tablesStore.getTableData.mockRejectedValueOnce({ response: { data: { code: 'invalid_sort', error: 'The table has no column "recorded at" to sort by' } } })
                const wrapper = mountRowsList()
                await headers(wrapper)[0].trigger('click')
                await flushPromises()
                expect(mocks.alerts.emit).toHaveBeenCalledWith('The table has no column "recorded at" to sort by', 'warning')
            })

            test('drops a sort the table refused and loads the rows again without it, every time', async () => {
                const refusal = { response: { data: { code: 'invalid_sort', error: 'The table has too many rows to be sorted by "recorded at"' } } }
                const wrapper = mountRowsList()

                for (const loads of [2, 4]) {
                    let refuse
                    mocks.tablesStore.getTableData.mockImplementationOnce(() => new Promise((resolve, reject) => { refuse = () => reject(refusal) }))
                    await headers(wrapper)[0].trigger('click')
                    expect(wrapper.find('thead .sorted').exists()).toBe(true)
                    refuse()
                    await flushPromises()

                    expect(mocks.tablesStore.setSort).toHaveBeenLastCalledWith(null)
                    expect(mocks.tablesStore.getTableData).toHaveBeenCalledTimes(loads)
                    expect(wrapper.find('thead .sorted').exists()).toBe(false)
                }
            })
        })

        test('shows where the current page sits in the whole table', () => {
            const wrapper = mountRowsList()
            expect(wrapper.find('[data-el="pagination"]').text()).toContain('26–50 of 1284')
        })

        test('says nothing about the size of a table that was counted in full', () => {
            const wrapper = mountRowsList()
            expect(wrapper.find('[data-el="table-too-big"]').exists()).toBe(false)
        })

        test('says when a table is too big to show in full, and marks the total as a minimum', () => {
            mocks.tablesStore.selectedTable = { schema, payload: { safe: [{ col: 26 }], total: 10000, totalCapped: true } }
            const wrapper = mountRowsList()
            expect(wrapper.find('[data-el="pagination"]').text()).toContain('26–50 of 10000+')
            expect(wrapper.find('[data-el="table-too-big"]').text()).toContain(`only its first ${(10000).toLocaleString()} rows are listed here`)
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
