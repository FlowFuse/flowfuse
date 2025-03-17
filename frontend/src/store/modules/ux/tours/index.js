import Tours from '../../../../tours/Tours.js'
import TourFirstDevice, { id as FirstDeviceTourId } from '../../../../tours/tour-first-device.js'
import TourWelcomeTrial, { id as TrialWelcomeTourId } from '../../../../tours/tour-welcome-trial.js'
import TourWelcome, { id as WelcomeTourId } from '../../../../tours/tour-welcome.js'

const initialState = () => ({
    tours: {
        [WelcomeTourId]: false,
        [FirstDeviceTourId]: false,
        [TrialWelcomeTourId]: false
    },
    modals: {
        education: false
    },
    completed: {},
    activeTour: null,
    shouldPresentTour: false
})

const meta = {
    persistence: {
        tours: {
            storage: 'localStorage'
            // clearOnLogout: true (cleared by default)
        },
        completed: {
            storage: 'localStorage'
        },
        shouldPresentTour: {
            storage: 'localStorage'
        }
    }
}

const state = initialState

const getters = {
    shouldShowEducationModal: (state) => {
        return state.modals.education
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
    },
    setActiveTour (state, tour) {
        if (!state.activeTour || !state.activeTour.isActive()) {
            state.activeTour = tour
        }
    },
    clearActiveTour (state) {
        state.activeTour = null
    },
    presentTour (state) {
        state.shouldPresentTour = true
    },
    withdrawTour (state) {
        state.shouldPresentTour = false
    },
    openModal (state, modal) {
        state.modals[modal] = true
    },
    closeModal (state, modal) {
        state.modals[modal] = false
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
    },
    setFirstDeviceTour ({ commit, dispatch }, callback = () => { }) {
        commit('setActiveTour', Tours.create(FirstDeviceTourId, TourFirstDevice, callback))
        dispatch('startTour')
    },
    setTrialWelcomeTour ({ commit, dispatch }, callback = () => { }) {
        commit('setActiveTour', Tours.create(TrialWelcomeTourId, TourWelcomeTrial, callback))
        dispatch('startTour')
    },
    setWelcomeTour ({ commit, dispatch }, callback = () => { }) {
        commit('setActiveTour', Tours.create(WelcomeTourId, TourWelcome, callback))
        dispatch('startTour')
    },
    startTour ({ state }) {
        setTimeout(() => {
            if (state.activeTour && !state.activeTour.isActive()) {
                state.activeTour.start()
            }
        }, 1000)
    },
    clearActiveTour ({ commit }) {
        commit('clearActiveTour')
    },
    presentTour ({ commit }) {
        commit('presentTour')
    },
    withdrawTour ({ commit }) {
        commit('withdrawTour')
    },
    openModal ({ commit }, modal) {
        commit('openModal', modal)
    },
    closeModal ({ commit }, modal) {
        commit('closeModal', modal)
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
