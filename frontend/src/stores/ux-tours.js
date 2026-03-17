import { defineStore } from 'pinia'
import { markRaw } from 'vue'

import Tours from '../tours/Tours.js'
import TourWelcome, { id as WelcomeTourId } from '../tours/tour-welcome.js'

export const useUxToursStore = defineStore('ux-tours', {
    state: () => ({
        tours: {
            [WelcomeTourId]: false
        },
        modals: {
            education: false
        },
        completed: {},
        activeTour: null,
        shouldPresentTour: false
    }),
    getters: {
        shouldShowEducationModal: (state) => state.modals.education,
        hasTourBeenCompleted: (state) => (tour) =>
            Object.prototype.hasOwnProperty.call(state.completed, tour)
    },
    actions: {
        activateTour (tour) {
            this.tours[tour] = true
        },
        deactivateTour (tour) {
            this.tours[tour] = false
            this.completed[tour] = true
        },
        resetTours () {
            Object.keys(this.tours).forEach(key => { this.tours[key] = false })
            this.completed = {}
        },
        setActiveTour (tour) {
            if (!this.activeTour || !this.activeTour.isActive()) {
                this.activeTour = markRaw(tour)
            }
        },
        clearActiveTour () {
            this.activeTour = null
        },
        presentTour () {
            this.shouldPresentTour = true
        },
        withdrawTour () {
            this.shouldPresentTour = false
        },
        openModal (modal) {
            this.modals[modal] = true
        },
        closeModal (modal) {
            this.modals[modal] = false
        },
        setWelcomeTour (callback = () => {}) {
            this.setActiveTour(Tours.create(WelcomeTourId, TourWelcome, callback))
            this.startTour()
        },
        startTour () {
            setTimeout(() => {
                if (this.activeTour && !this.activeTour.isActive()) {
                    this.activeTour.start()
                }
            }, 1000)
        }
    },
    persist: {
        pick: ['tours', 'completed', 'shouldPresentTour'],
        storage: localStorage
    }
})
