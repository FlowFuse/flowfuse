import tablesApi from '../../../../api/tables.js'

const initialState = () => ({
    databases: {},
    databaseSelection: null,
    tables: {},
    tableSelection: null
})

const meta = {
    persistence: {
        databases: {
            storage: 'localStorage'
            // clearOnLogout: true (cleared by default)
        }
    }
}

const state = initialState

const getters = {
    database: (state) => {
        if (Object.prototype.hasOwnProperty.call(state.databases, state.databaseSelection)) {
            return state.databases[state.databaseSelection]
        }
        return null
    },
    tables: (state) => (databaseId) => {
        if (Object.prototype.hasOwnProperty.call(state.tables, databaseId)) {
            return state.tables[databaseId]
        }
        return []
    },
    selectedTable: (state) => {
        if (Object.keys(state.tables).includes(state.databaseSelection)) {
            return state.tables[state.databaseSelection].find(table => {
                return table.name === state.tableSelection
            })
        }
        return null
    }
}
const mutations = {
    setDatabases (state, payload) {
        payload.forEach(database => {
            state.databases[database.id] = database
        })
    },
    setTables (state, payload) {
        state.tables[payload.databaseId] = payload.tables
    },
    clearState (state) {
        const cleanState = initialState()
        Object.keys(cleanState).forEach(key => {
            state[key] = cleanState[key]
        })
    },
    updateTableSelection (state, tableName) {
        state.tableSelection = tableName
    },
    updateDatabaseSelection (state, databaseId) {
        state.databaseSelection = databaseId
    },
    setTableSchema (state, { databaseId, tableName, schema }) {
        Object.keys(state.tables[databaseId]).forEach(key => {
            if (state.tables[databaseId][key].name === tableName) {
                state.tables[databaseId][key].schema = schema
            }
        })
    },
    setTableData (state, { databaseId, tableName, data }) {
        Object.keys(state.tables[databaseId]).forEach(key => {
            if (state.tables[databaseId][key].name === tableName) {
                state.tables[databaseId][key].data = data
            }
        })
    }
}
const actions = {
    async getDatabases ({ commit, rootState }) {
        const team = rootState.account?.team
        return tablesApi.getDataBases(team.id)
            .then((databases) => {
                commit('setDatabases', databases)

                return databases
            })
    },
    getTables ({ commit, rootState }, databaseId) {
        const team = rootState.account?.team
        return tablesApi.getTables(team.id, databaseId)
            .then((tables) => {
                commit('setTables', { databaseId, tables })

                return tables
            })
    },
    clearState ({ commit }) {
        commit('clearState')
    },
    updateTableSelection ({ commit }, tableName) {
        commit('updateTableSelection', tableName)
    },
    updateDatabaseSelection ({ commit }, databaseId) {
        commit('updateDatabaseSelection', databaseId)
    },
    getTableSchema ({ commit }, { databaseId, tableName, teamId }) {
        return tablesApi.getTableSchema(teamId, databaseId, tableName)
            .then((schema) => {
                commit('setTableSchema', { databaseId, tableName, schema })
            })
    },
    getTableData ({ commit }, { databaseId, tableName, teamId }) {
        return tablesApi.getTableData(teamId, databaseId, tableName)
            .then((data) => {
                commit('setTableData', { databaseId, tableName, data })
            })
    }
}

export default {
    namespaced: true,
    state,
    initialState: initialState(),
    getters,
    mutations,
    actions,
    meta
}
