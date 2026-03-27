import { defineStore } from 'pinia'

import tablesApi from '../api/tables.js'
import { hashString } from '../composables/strings/String.js'

import { useAccountTeamStore } from './account-team.js'

const emptyColumn = {
    name: '',
    type: '',
    nullable: false,
    default: '',
    hasDefault: false,
    unsigned: false
}

export const useProductTablesStore = defineStore('product-tables', {
    state: () => ({
        databases: {},
        databaseSelection: null,
        tables: {},
        tableSelection: null,
        newTable: { name: '', columns: [{ ...emptyColumn }] },
        isLoading: false
    }),
    getters: {
        database: (state) => {
            if (Object.prototype.hasOwnProperty.call(state.databases, state.databaseSelection)) {
                return state.databases[state.databaseSelection]
            }
            return null
        },
        tablesByDatabaseId: (state) => (databaseId) => {
            if (Object.prototype.hasOwnProperty.call(state.tables, databaseId)) {
                return state.tables[databaseId]
            }
            return []
        },
        selectedTable: (state) => {
            if (Object.keys(state.tables).includes(state.databaseSelection)) {
                return state.tables[state.databaseSelection]?.find(t => t.name === state.tableSelection)
            }
            return null
        }
    },
    actions: {
        async createDatabase ({ teamId, databaseName = '' }) {
            const database = await tablesApi.createDatabase(teamId, databaseName)
            this.databases[database.id] = database
            return database
        },
        async getDatabases () {
            const { team } = useAccountTeamStore()
            const databases = await tablesApi.getDataBases(team.id)
            databases.forEach(db => { this.databases[db.id] = db })
            return databases
        },
        async getTables (databaseId) {
            const { team } = useAccountTeamStore()
            let tables = await tablesApi.getTables(team.id, databaseId)
            tables = [...tables].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }))
            this.tables[databaseId] = tables
            if (tables.length > 0) this.tableSelection = tables[0].name
            return tables
        },
        clearState () { this.$reset() },
        updateTableSelection (tableName) { this.tableSelection = tableName },
        updateDatabaseSelection (databaseId) { this.databaseSelection = databaseId },
        async getTableSchema ({ databaseId, tableName, teamId }) {
            const schema = await tablesApi.getTableSchema(teamId, databaseId, tableName)
            schema.forEach(col => { col.safeName = hashString(col.name) })
            Object.keys(this.tables[databaseId]).forEach(key => {
                if (this.tables[databaseId][key].name === tableName) {
                    this.tables[databaseId][key].schema = schema
                }
            })
        },
        async getTableData ({ databaseId, tableName, teamId }) {
            const data = await tablesApi.getTableData(teamId, databaseId, tableName)
            const payload = {
                data,
                safe: data.map(row => Object.fromEntries(Object.entries(row).map(([k, v]) => [hashString(k), v])))
            }
            Object.keys(this.tables[databaseId]).forEach(key => {
                if (this.tables[databaseId][key].name === tableName) {
                    this.tables[databaseId][key].payload = payload
                }
            })
        },
        async createTable ({ databaseId }) {
            const { team } = useAccountTeamStore()
            const sanitizedColumns = this.newTable.columns.map(col => {
                const c = { ...col }
                if (!c.hasDefault) delete c.default
                if (!c.unsigned) delete c.unsigned
                return c
            })
            return tablesApi.createTable(team.id, databaseId, { name: this.newTable.name, columns: sanitizedColumns })
        },
        deleteTable ({ teamId, databaseId, tableName }) {
            return tablesApi.deleteTable(teamId, databaseId, tableName)
        },
        addNewTableColumn () { this.newTable.columns.push({ ...emptyColumn }) },
        removeNewTableColumn (columnKey) { this.newTable.columns.splice(columnKey, 1) },
        setTableLoadingState (isLoading) { this.isLoading = isLoading }
    },
    persist: {
        pick: ['databases', 'newTable'],
        storage: localStorage
    }
})
