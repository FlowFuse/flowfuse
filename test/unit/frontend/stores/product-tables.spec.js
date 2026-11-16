import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/stores/context.js', () => ({
    useContextStore: vi.fn(() => ({ team: { id: 'team-1' } }))
}))

vi.mock('@/api/tables.js', () => ({
    default: {
        createDatabase: vi.fn(),
        getDataBases: vi.fn(),
        getTables: vi.fn(),
        getTableSchema: vi.fn(),
        getTableData: vi.fn(),
        createTable: vi.fn(),
        deleteTable: vi.fn()
    }
}))

vi.mock('@/composables/strings/String.js', () => ({
    hashString: vi.fn((s) => `safe_${s}`)
}))

// imported after mocks so vi.mock hoisting resolves correctly
const { useProductTablesStore } = await import('@/stores/product-tables.js')
const tablesApi = (await import('@/api/tables.js')).default

describe('product-tables store', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        vi.clearAllMocks()
    })

    describe('initial state', () => {
        it('has empty databases and tables', () => {
            const store = useProductTablesStore()
            expect(store.databases).toEqual({})
            expect(store.tables).toEqual({})
            expect(store.databaseSelection).toBeNull()
            expect(store.tableSelection).toBeNull()
            expect(store.isLoading).toBe(false)
        })

        it('has a newTable with one empty column', () => {
            const store = useProductTablesStore()
            expect(store.newTable.name).toBe('')
            expect(store.newTable.schema).toBe('public')
            expect(store.newTable.columns).toHaveLength(1)
            expect(store.newTable.columns[0].name).toBe('')
        })
    })

    describe('getters', () => {
        it('database returns the selected database', () => {
            const store = useProductTablesStore()
            store.databases = { 'db-1': { id: 'db-1', name: 'My DB' } }
            store.databaseSelection = 'db-1'
            expect(store.database).toEqual({ id: 'db-1', name: 'My DB' })
        })

        it('database returns null when selection is not in databases', () => {
            const store = useProductTablesStore()
            store.databaseSelection = 'db-missing'
            expect(store.database).toBeNull()
        })

        it('tablesByDatabaseId returns tables for a given database', () => {
            const store = useProductTablesStore()
            store.tables = { 'db-1': [{ name: 'users' }] }
            expect(store.tablesByDatabaseId('db-1')).toEqual([{ name: 'users' }])
        })

        it('tablesByDatabaseId returns [] for unknown database', () => {
            const store = useProductTablesStore()
            expect(store.tablesByDatabaseId('db-missing')).toEqual([])
        })

        it('selectedTable returns the matching table', () => {
            const store = useProductTablesStore()
            store.databaseSelection = 'db-1'
            store.tableSelection = { name: 'users', dbSchema: undefined }
            store.tables = { 'db-1': [{ name: 'users' }, { name: 'orders' }] }
            expect(store.selectedTable).toEqual({ name: 'users' })
        })

        it('selectedTable matches on both name and dbSchema', () => {
            const store = useProductTablesStore()
            store.databaseSelection = 'db-1'
            store.tableSelection = { name: 'users', dbSchema: 'reports' }
            store.tables = { 'db-1': [{ name: 'users', dbSchema: 'public' }, { name: 'users', dbSchema: 'reports' }] }
            expect(store.selectedTable).toEqual({ name: 'users', dbSchema: 'reports' })
        })

        it('selectedTable returns undefined when no selection matches', () => {
            const store = useProductTablesStore()
            store.databaseSelection = 'db-1'
            store.tableSelection = { name: 'unknown', dbSchema: undefined }
            store.tables = { 'db-1': [{ name: 'users' }] }
            expect(store.selectedTable).toBeUndefined()
        })
    })

    describe('createDatabase', () => {
        it('adds the created database to state', async () => {
            const store = useProductTablesStore()
            tablesApi.createDatabase.mockResolvedValue({ id: 'db-1', name: 'My DB' })
            await store.createDatabase({ teamId: 'team-1', databaseName: 'My DB' })
            expect(store.databases['db-1']).toEqual({ id: 'db-1', name: 'My DB' })
        })
    })

    describe('getDatabases', () => {
        it('populates databases from API response', async () => {
            const store = useProductTablesStore()
            tablesApi.getDataBases.mockResolvedValue([{ id: 'db-1' }, { id: 'db-2' }])
            await store.getDatabases()
            expect(store.databases['db-1']).toEqual({ id: 'db-1' })
            expect(store.databases['db-2']).toEqual({ id: 'db-2' })
        })
    })

    describe('getTables', () => {
        it('sorts and stores tables, sets tableSelection to first', async () => {
            const store = useProductTablesStore()
            tablesApi.getTables.mockResolvedValue([{ name: 'orders' }, { name: 'accounts' }])
            await store.getTables('db-1')
            expect(store.tables['db-1'][0].name).toBe('accounts')
            expect(store.tables['db-1'][1].name).toBe('orders')
            expect(store.tableSelection).toEqual({ name: 'accounts', dbSchema: undefined })
        })

        it('does not set tableSelection when no tables returned', async () => {
            const store = useProductTablesStore()
            tablesApi.getTables.mockResolvedValue([])
            await store.getTables('db-1')
            expect(store.tableSelection).toBeNull()
        })

        it('maps the API schema field to dbSchema, leaving schema free for column definitions', async () => {
            const store = useProductTablesStore()
            tablesApi.getTables.mockResolvedValue([{ name: 'orders', schema: 'reports' }])
            await store.getTables('db-1')
            expect(store.tables['db-1'][0].dbSchema).toBe('reports')
            expect(store.tables['db-1'][0].schema).toBeUndefined()
        })
    })

    describe('clearState', () => {
        it('resets all state to initial values', () => {
            const store = useProductTablesStore()
            store.databases = { 'db-1': {} }
            store.databaseSelection = 'db-1'
            store.isLoading = true
            store.clearState()
            expect(store.databases).toEqual({})
            expect(store.databaseSelection).toBeNull()
            expect(store.isLoading).toBe(false)
        })
    })

    describe('updateTableSelection / updateDatabaseSelection', () => {
        it('sets tableSelection', () => {
            const store = useProductTablesStore()
            store.updateTableSelection({ name: 'orders', dbSchema: 'public' })
            expect(store.tableSelection).toEqual({ name: 'orders', dbSchema: 'public' })
        })

        it('sets databaseSelection', () => {
            const store = useProductTablesStore()
            store.updateDatabaseSelection('db-1')
            expect(store.databaseSelection).toBe('db-1')
        })
    })

    describe('getTableSchema', () => {
        it('adds safeName to each column and stores schema on the table', async () => {
            const store = useProductTablesStore()
            store.tables = { 'db-1': [{ name: 'users' }] }
            tablesApi.getTableSchema.mockResolvedValue([{ name: 'id', type: 'int' }])
            await store.getTableSchema({ databaseId: 'db-1', tableName: 'users', teamId: 'team-1' })
            expect(store.tables['db-1'][0].schema[0].safeName).toBe('safe_id')
        })

        it('only updates the table matching both name and schemaName when schemaName is given', async () => {
            const store = useProductTablesStore()
            store.tables = { 'db-1': [{ name: 'users', dbSchema: 'public' }, { name: 'users', dbSchema: 'reports' }] }
            tablesApi.getTableSchema.mockResolvedValue([{ name: 'id', type: 'int' }])
            await store.getTableSchema({ databaseId: 'db-1', tableName: 'users', teamId: 'team-1', schemaName: 'reports' })
            expect(tablesApi.getTableSchema).toHaveBeenCalledWith('team-1', 'db-1', 'users', 'reports')
            expect(store.tables['db-1'][0].schema).toBeUndefined()
            expect(store.tables['db-1'][1].schema[0].safeName).toBe('safe_id')
        })
    })

    describe('getTableData', () => {
        it('stores data, safe-keyed data and the table total on the table', async () => {
            const store = useProductTablesStore()
            store.tables = { 'db-1': [{ name: 'users' }] }
            tablesApi.getTableData.mockResolvedValue({ count: 42, rows: [{ id: 1, name: 'Alice' }] })
            await store.getTableData({ databaseId: 'db-1', tableName: 'users', teamId: 'team-1' })
            const table = store.tables['db-1'][0]
            expect(table.payload.data).toEqual([{ id: 1, name: 'Alice' }])
            expect(table.payload.safe[0].safe_id).toBe(1)
            expect(table.payload.total).toBe(42)
        })

        it('asks for the first page of 25 rows by default', async () => {
            const store = useProductTablesStore()
            store.tables = { 'db-1': [{ name: 'users' }] }
            tablesApi.getTableData.mockResolvedValue({ count: 0, rows: [] })
            await store.getTableData({ databaseId: 'db-1', tableName: 'users', teamId: 'team-1' })
            expect(tablesApi.getTableData).toHaveBeenCalledWith('team-1', 'db-1', 'users', undefined, { page: 1, limit: 25 })
        })

        it('asks for the current page at the current page size', async () => {
            const store = useProductTablesStore()
            store.tables = { 'db-1': [{ name: 'users' }] }
            tablesApi.getTableData.mockResolvedValue({ count: 0, rows: [] })
            store.setPageSize(50)
            store.setPage(3)
            await store.getTableData({ databaseId: 'db-1', tableName: 'users', teamId: 'team-1' })
            expect(tablesApi.getTableData).toHaveBeenCalledWith('team-1', 'db-1', 'users', undefined, { page: 3, limit: 50 })
        })

        it('only updates the table matching both name and schemaName when schemaName is given', async () => {
            const store = useProductTablesStore()
            store.tables = { 'db-1': [{ name: 'users', dbSchema: 'public' }, { name: 'users', dbSchema: 'reports' }] }
            tablesApi.getTableData.mockResolvedValue({ count: 1, rows: [{ id: 1, name: 'Alice' }] })
            await store.getTableData({ databaseId: 'db-1', tableName: 'users', teamId: 'team-1', schemaName: 'reports' })
            expect(tablesApi.getTableData).toHaveBeenCalledWith('team-1', 'db-1', 'users', 'reports', { page: 1, limit: 25 })
            expect(store.tables['db-1'][0].payload).toBeUndefined()
            expect(store.tables['db-1'][1].payload.data).toEqual([{ id: 1, name: 'Alice' }])
        })
    })

    describe('getTableData when the table or the page changes underneath it', () => {
        const args = { databaseId: 'db-1', tableName: 'users', teamId: 'team-1' }
        const deferred = () => {
            let resolve
            const promise = new Promise(_resolve => { resolve = _resolve })
            return { promise, resolve }
        }

        it('falls back to the last page when the table shrank and the current page is gone', async () => {
            const store = useProductTablesStore()
            store.tables = { 'db-1': [{ name: 'users' }] }
            store.setPage(5)
            tablesApi.getTableData
                .mockResolvedValueOnce({ count: 60, rows: [] })
                .mockResolvedValueOnce({ count: 60, rows: [{ id: 51 }] })
            await store.getTableData(args)
            expect(tablesApi.getTableData).toHaveBeenNthCalledWith(1, 'team-1', 'db-1', 'users', undefined, { page: 5, limit: 25 })
            expect(tablesApi.getTableData).toHaveBeenNthCalledWith(2, 'team-1', 'db-1', 'users', undefined, { page: 3, limit: 25 })
            expect(store.page).toBe(3)
            expect(store.tables['db-1'][0].payload.data).toEqual([{ id: 51 }])
            expect(store.tables['db-1'][0].payload.total).toBe(60)
        })

        it('falls back to the first page, without asking again and again, when the table is now empty', async () => {
            const store = useProductTablesStore()
            store.tables = { 'db-1': [{ name: 'users' }] }
            store.setPage(4)
            tablesApi.getTableData.mockResolvedValue({ count: 0, rows: [] })
            await store.getTableData(args)
            expect(tablesApi.getTableData).toHaveBeenCalledTimes(2)
            expect(store.page).toBe(1)
            expect(store.tables['db-1'][0].payload.data).toEqual([])
        })

        it('does not ask twice when the current page still exists', async () => {
            const store = useProductTablesStore()
            store.tables = { 'db-1': [{ name: 'users' }] }
            store.setPage(3)
            tablesApi.getTableData.mockResolvedValue({ count: 60, rows: [{ id: 51 }] })
            await store.getTableData(args)
            expect(tablesApi.getTableData).toHaveBeenCalledTimes(1)
            expect(store.page).toBe(3)
        })

        it('ignores a page that arrives after a newer page was asked for', async () => {
            const store = useProductTablesStore()
            store.tables = { 'db-1': [{ name: 'users' }] }
            const page2 = deferred()
            const page3 = deferred()
            tablesApi.getTableData.mockReturnValueOnce(page2.promise).mockReturnValueOnce(page3.promise)

            store.setPage(2)
            const loadingPage2 = store.getTableData(args)
            store.setPage(3)
            const loadingPage3 = store.getTableData(args)

            page3.resolve({ count: 120, rows: [{ id: 51 }] })
            await loadingPage3
            page2.resolve({ count: 120, rows: [{ id: 26 }] })
            await loadingPage2

            expect(store.page).toBe(3)
            expect(store.tables['db-1'][0].payload.data).toEqual([{ id: 51 }])
        })

        it('ignores a page that arrives after the page size was changed', async () => {
            const store = useProductTablesStore()
            store.tables = { 'db-1': [{ name: 'users' }] }
            const small = deferred()
            const large = deferred()
            tablesApi.getTableData.mockReturnValueOnce(small.promise).mockReturnValueOnce(large.promise)

            const loadingSmall = store.getTableData(args)
            store.setPageSize(50)
            const loadingLarge = store.getTableData(args)

            large.resolve({ count: 120, rows: [{ id: 1 }, { id: 2 }] })
            await loadingLarge
            small.resolve({ count: 120, rows: [{ id: 1 }] })
            await loadingSmall

            expect(store.tables['db-1'][0].payload.data).toEqual([{ id: 1 }, { id: 2 }])
        })

        it('does not move the page back when a stale response reports a smaller table', async () => {
            const store = useProductTablesStore()
            store.tables = { 'db-1': [{ name: 'users' }] }
            const page5 = deferred()
            tablesApi.getTableData.mockReturnValueOnce(page5.promise).mockResolvedValueOnce({ count: 120, rows: [{ id: 26 }] })

            store.setPage(5)
            const loadingPage5 = store.getTableData(args)
            store.setPage(2)
            await store.getTableData(args)
            page5.resolve({ count: 10, rows: [] })
            await loadingPage5

            expect(tablesApi.getTableData).toHaveBeenCalledTimes(2)
            expect(store.page).toBe(2)
            expect(store.tables['db-1'][0].payload.data).toEqual([{ id: 26 }])
        })
    })

    describe('showing original values', () => {
        it('shows formatted values until asked otherwise', () => {
            const store = useProductTablesStore()
            expect(store.showOriginalValues).toBe(false)
            store.setShowOriginalValues(true)
            expect(store.showOriginalValues).toBe(true)
        })
    })

    describe('paging', () => {
        it('goes back to the first page when the page size changes', () => {
            const store = useProductTablesStore()
            store.setPage(4)
            store.setPageSize(100)
            expect(store.pageSize).toBe(100)
            expect(store.page).toBe(1)
        })

        it('goes back to the first page when another table is selected, keeping the page size', () => {
            const store = useProductTablesStore()
            store.setPageSize(50)
            store.setPage(4)
            store.updateTableSelection({ name: 'orders', dbSchema: 'public' })
            expect(store.page).toBe(1)
            expect(store.pageSize).toBe(50)
        })
    })

    describe('deleteTable', () => {
        it('passes schemaName through to the API', async () => {
            const store = useProductTablesStore()
            tablesApi.deleteTable.mockResolvedValue({})
            await store.deleteTable({ teamId: 'team-1', databaseId: 'db-1', tableName: 'users', schemaName: 'reports' })
            expect(tablesApi.deleteTable).toHaveBeenCalledWith('team-1', 'db-1', 'users', 'reports')
        })
    })

    describe('createTable', () => {
        it('sends the schema with the table name', async () => {
            const store = useProductTablesStore()
            store.newTable = { name: 'orders', schema: 'reports', columns: [] }
            tablesApi.createTable.mockResolvedValue({})
            await store.createTable({ databaseId: 'db-1' })
            expect(tablesApi.createTable.mock.calls[0][2]).toMatchObject({ name: 'orders', schema: 'reports' })
        })

        it('resets the draft after a successful create', async () => {
            const store = useProductTablesStore()
            store.newTable = { name: 'orders', schema: 'reports', columns: [{ name: 'id', type: 'bigint' }] }
            tablesApi.createTable.mockResolvedValue({})
            await store.createTable({ databaseId: 'db-1' })
            expect(store.newTable.name).toBe('')
            expect(store.newTable.schema).toBe('public')
            expect(store.newTable.columns).toHaveLength(1)
            expect(store.newTable.columns[0].name).toBe('')
        })

        it('keeps the draft when the create fails', async () => {
            const store = useProductTablesStore()
            store.newTable = { name: 'orders', schema: 'reports', columns: [] }
            tablesApi.createTable.mockRejectedValue(new Error('conflict'))
            await expect(store.createTable({ databaseId: 'db-1' })).rejects.toThrow('conflict')
            expect(store.newTable).toMatchObject({ name: 'orders', schema: 'reports' })
        })

        it('sends the public schema when the draft has none', async () => {
            const store = useProductTablesStore()
            store.newTable = { name: 'orders', columns: [] }
            tablesApi.createTable.mockResolvedValue({})
            await store.createTable({ databaseId: 'db-1' })
            expect(tablesApi.createTable.mock.calls[0][2]).toMatchObject({ schema: 'public' })
        })

        it('strips hasDefault and unsigned when not set, then calls API', async () => {
            const store = useProductTablesStore()
            store.newTable = {
                name: 'orders',
                columns: [{ name: 'id', type: 'int', hasDefault: false, unsigned: false, nullable: false, default: 'x' }]
            }
            tablesApi.createTable.mockResolvedValue({})
            await store.createTable({ databaseId: 'db-1' })
            const cols = tablesApi.createTable.mock.calls[0][2].columns
            expect(cols[0]).not.toHaveProperty('default')
            expect(cols[0]).not.toHaveProperty('unsigned')
        })

        it('does not mutate the original column objects', async () => {
            const store = useProductTablesStore()
            const col = { name: 'id', type: 'int', hasDefault: false, unsigned: false, nullable: false, default: 'x' }
            store.newTable = { name: 'orders', columns: [col] }
            tablesApi.createTable.mockResolvedValue({})
            await store.createTable({ databaseId: 'db-1' })
            expect(col.default).toBe('x')
        })
    })

    describe('addNewTableColumn / removeNewTableColumn', () => {
        it('addNewTableColumn appends an empty column', () => {
            const store = useProductTablesStore()
            store.addNewTableColumn()
            expect(store.newTable.columns).toHaveLength(2)
            expect(store.newTable.columns[1].name).toBe('')
        })

        it('removeNewTableColumn removes column at given index', () => {
            const store = useProductTablesStore()
            store.newTable.columns.push({ name: 'second', type: 'text', nullable: false, default: '', hasDefault: false, unsigned: false })
            store.removeNewTableColumn(0)
            expect(store.newTable.columns).toHaveLength(1)
            expect(store.newTable.columns[0].name).toBe('second')
        })
    })

    describe('setTableLoadingState', () => {
        it('sets isLoading', () => {
            const store = useProductTablesStore()
            store.setTableLoadingState(true)
            expect(store.isLoading).toBe(true)
            store.setTableLoadingState(false)
            expect(store.isLoading).toBe(false)
        })
    })
})
