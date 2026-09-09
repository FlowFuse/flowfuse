import { defineStore } from 'pinia'

export const useUxStore = defineStore('ux', {
    state: () => ({
        userActions: {
            hasOpenedDeviceEditor: false
        },
        isNewlyCreatedUser: false,
        isOnboarding: null,
        overlay: false
    }),
    actions: {
        setNewlyCreatedUser () {
            this.isNewlyCreatedUser = true
            this.isOnboarding = true
        },
        validateUserAction (action) {
            if (Object.prototype.hasOwnProperty.call(this.userActions, action)) {
                this.userActions[action] = true
            }
        },
        checkIfIsNewlyCreatedUser (user) {
            const userCreatedDate = new Date(user.createdAt).getTime()
            const oneWeekAgo = new Date()
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
            this.isNewlyCreatedUser = userCreatedDate >= oneWeekAgo.getTime()
            if (this.isOnboarding === null) {
                this.isOnboarding = this.isNewlyCreatedUser
            }
        },
        endOnboarding () { this.isOnboarding = false },
        openOverlay () { this.overlay = true },
        closeOverlay () { this.overlay = false }
    },
    persist: {
        pick: ['isNewlyCreatedUser', 'isOnboarding', 'userActions'],
        storage: localStorage
    }
})
