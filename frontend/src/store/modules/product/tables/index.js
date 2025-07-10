import tablesApi from '../../../../api/tables.js'

const initialState = () => ({
    databases: [],
    tables: {}
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
    database: (state) => (databaseId) => {
        if (Object.prototype.hasOwnProperty.call(state.databases, databaseId)) {
            return state.databases[databaseId]
        }
        return null
    }
}
const mutations = {
    setDatabases (state, payload) {
        state.databases = payload
    },
    setTables (state, payload) {
        state.tables[payload.databaseId] = payload.tables
    },
    clearState (state) {
        state = initialState()
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
