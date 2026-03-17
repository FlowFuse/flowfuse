import { defineStore } from 'pinia'

export const useUxStore = defineStore('ux', {
    state: () => ({
        userActions: {
            hasOpenedDeviceEditor: false
        },
        isNewlyCreatedUser: false,
        overlay: false
    }),
    actions: {
        setNewlyCreatedUser () { this.isNewlyCreatedUser = true },
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
        },
        openOverlay () { this.overlay = true },
        closeOverlay () { this.overlay = false }
    },
    persist: {
        pick: ['isNewlyCreatedUser', 'userActions'],
        storage: localStorage
    }
})
