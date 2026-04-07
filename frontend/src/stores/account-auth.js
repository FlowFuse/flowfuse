import { defineStore } from 'pinia'

import userApi from '../api/user.js'

export const useAccountAuthStore = defineStore('account-auth', {
    state: () => ({
        user: null,
        loginInflight: false,
        loginError: null,
        redirectUrlAfterLogin: null
    }),
    getters: {
        isAdminUser: (state) => !!state.user?.admin
    },
    actions: {
        login (user) {
            this.user = user
            this.loginInflight = false
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
