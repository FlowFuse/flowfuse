import userApi from '@/api/user'
import router from "@/routes"

// initial state
const state = () => ({
    // We do not know if there is a valid session yet
    pending: true,
    // A login attempt is inflight
    loginInflight: false,
    // redirect url,
    redirectUrlAfterLogin: null,
    // The active user
    user: null,
    // An error during login
    loginError: null
})

// getters
const getters = {
    user(state) {
        return state.user
    },
    redirectUrlAfterLogin(state) {
        return state.redirectUrlAfterLogin
    }
}

const mutations = {
    clearPending(state) {
        state.pending = false;
    },
    setLoginInflight(state) {
        state.loginInflight = true;
    },
    login(state, user) {
        state.loginInflight = false;
        state.redirectUrlAfterLogin = null;
        state.user = user;
    },
    logout(state) {
        state.loginInflight = false;
        state.pending = true;
        state.user = null
    },
    sessionExpired(state) {
        state.user = null;
    },
    loginFailed(state, error) {
        state.loginInflight = false;
        state.loginError = error;
    },
    setRedirectUrl(state, url) {
        state.redirectUrlAfterLogin = url;
    }
}

// actions
const actions = {
    async checkState(state,redirectToUserSettings) {
        userApi.getUser().then(user => {
            state.commit('login', user)
            state.commit('clearPending')

            if (redirectToUserSettings) {
                // If this is a user-driven login, take them to the profile page
                router.push(redirectToUserSettings)
            }
        }).catch(_ => {
            // Not logged in
            state.commit('clearPending')
            state.commit('setRedirectUrl',router.currentRoute.value.fullPath);
            router.push("/")
        })
    },

    async login(state, credentials) {
        try {
            state.commit('setLoginInflight')
            await userApi.login(credentials.username,credentials.password,credentials.remember)
            state.dispatch('checkState', state.getters.redirectUrlAfterLogin)
        } catch(err) {
            state.commit("loginFailed","Login failed")
        }
    },
    async logout(state) {
        state.commit('logout');
        userApi.logout()
            .catch(_ => {})
            .finally(() => {
                window.location.reload()
            })
    }
}

export default {
    namespaced: true,
    state,
    getters,
    actions,
    mutations
}
