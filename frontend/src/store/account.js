import userApi from '@/api/user'
import router from "@/routes"

// initial state
const state = () => ({
    // We do not know if there is a valid session yet
    pending: true,
    // A login attempt is inflight
    loginInflight: false,
    // The active user
    user: null,
    // An error during login
    loginError: null
})

// getters
const getters = {
    user(state) {
        return state.user
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
    }
}

// actions
const actions = {
    async checkState(state, redirectToUserSettings) {
        userApi.getUser().then(user => {
            state.commit('login', user)
            state.commit('clearPending')
            if (redirectToUserSettings) {
                // If this is a user-driven login, take them to the profile page
                router.push("/")
            }
        }).catch(_ => {
            // Not logged in
            state.commit('clearPending')
            router.push("/")
        })
    },

    async login(state, credentials) {
        try {
            state.commit('setLoginInflight')
            await userApi.login(credentials.username,credentials.password,credentials.remember)
            state.dispatch('checkState',true);
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
