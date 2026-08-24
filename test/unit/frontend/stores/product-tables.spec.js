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
        it('stores data and safe-keyed data on the table', async () => {
            const store = useProductTablesStore()
            store.tables = { 'db-1': [{ name: 'users' }] }
            tablesApi.getTableData.mockResolvedValue([{ id: 1, name: 'Alice' }])
            await store.getTableData({ databaseId: 'db-1', tableName: 'users', teamId: 'team-1' })
            const table = store.tables['db-1'][0]
            expect(table.payload.data).toEqual([{ id: 1, name: 'Alice' }])
            expect(table.payload.safe[0].safe_id).toBe(1)
        })

        it('only updates the table matching both name and schemaName when schemaName is given', async () => {
            const store = useProductTablesStore()
            store.tables = { 'db-1': [{ name: 'users', dbSchema: 'public' }, { name: 'users', dbSchema: 'reports' }] }
            tablesApi.getTableData.mockResolvedValue([{ id: 1, name: 'Alice' }])
            await store.getTableData({ databaseId: 'db-1', tableName: 'users', teamId: 'team-1', schemaName: 'reports' })
            expect(tablesApi.getTableData).toHaveBeenCalledWith('team-1', 'db-1', 'users', 'reports')
            expect(store.tables['db-1'][0].payload).toBeUndefined()
            expect(store.tables['db-1'][1].payload.data).toEqual([{ id: 1, name: 'Alice' }])
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
