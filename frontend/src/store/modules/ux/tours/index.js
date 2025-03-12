const initialState = () => ({
    tours: {
        welcome: false,
        education: false, // Ceci n’est pas une tour
        firstDevice: false
    },
    completed: {}
})

const meta = {
    persistence: {
        tours: {
            storage: 'localStorage'
            // clearOnLogout: true (cleared by default)
        }
    }
}

const state = initialState

const getters = {
    shouldShowEducationModal: (state) => {
        return state.tours.education
    },
    hasTourBeenCompleted: (state) => (tour) => {
        return Object.prototype.hasOwnProperty.call(state.completed, tour)
    }
}

const mutations = {
    activateTour (state, tour) {
        state.tours[tour] = true
    },
    deactivateTour (state, tour) {
        state.tours[tour] = false
        state.completed[tour] = true
    },
    resetTours (state) {
        Object.keys(state.tours)
            .forEach(key => {
                state.tours[key] = false
            })
        state.completed = {}
    }
}

const actions = {
    activateTour ({ commit }, tour) {
        commit('activateTour', tour)
    },
    deactivateTour ({ commit, state }, tour) {
        commit('deactivateTour', tour)
    },
    resetTours ({ commit }) {
        commit('resetTours')
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
