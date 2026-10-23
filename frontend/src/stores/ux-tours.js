import { defineStore } from 'pinia'
import { markRaw } from 'vue'

import Tours from '../tours/Tours.js'
import TourWelcome, { id as WelcomeTourId } from '../tours/tour-welcome.js'

import userApi from '@/api/user.js'
import { useAccountAuthStore } from '@/stores/account-auth.js'

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
        // Auto-show once, then hold off for ten days after it was last shown.
        // Kept in the user's settings so the hold follows them across logouts
        // and browsers, and does not leak to another account on the same one.
        shouldAutoShowAiConnectorModal: () => {
            const user = useAccountAuthStore().user
            // Not until the user is loaded, so it doesn't flash for someone
            // who has already seen it
            if (!user) {
                return false
            }
            const lastShownAt = user.settings?.aiConnectorLastShownAt
            if (!lastShownAt) {
                return true
            }
            const tenDays = 10 * 24 * 60 * 60 * 1000
            return Date.now() - lastShownAt > tenDays
        },
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
        markAiConnectorShown () {
            const authStore = useAccountAuthStore()
            if (!authStore.user) {
                return
            }
            const aiConnectorLastShownAt = Date.now()
            authStore.setUser({
                ...authStore.user,
                settings: { ...authStore.user.settings, aiConnectorLastShownAt }
            })
            // Best-effort: the local copy is already updated
            userApi.updateUserSettings({ aiConnectorLastShownAt }).catch(() => {})
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
