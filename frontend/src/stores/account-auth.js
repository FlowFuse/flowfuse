import { defineStore } from 'pinia'

import userApi from '../api/user.js'

export const useAccountAuthStore = defineStore('account-auth', {
    state: () => ({
        user: null,
        pending: true,
        loginInflight: false,
        loginError: null,
        redirectUrlAfterLogin: null,
        offline: null
    }),
    getters: {
        isAdminUser: (state) => !!state.user?.admin
    },
    actions: {
        login (user) {
            this.user = user
            this.loginInflight = false
        },
        clearPending () {
            this.pending = false
        },
        setPending (value) {
            this.pending = value
        },
        setLoginInflight () {
            this.loginInflight = true
        },
        loginFailed (error) {
            this.loginInflight = false
            this.loginError = error
        },
        sessionExpired () {
            this.user = null
        },
        setUser (user) {
            this.user = user
        },
        setOffline (value) {
            this.offline = value
        },
        setRedirectUrl (url) {
            this.redirectUrlAfterLogin = url
        },
        async checkIfAuthenticated () {
            const user = await userApi.getUser()
            this.user = user
        }
    },
    persist: {
        pick: ['redirectUrlAfterLogin'],
        storage: localStorage
    }
})
