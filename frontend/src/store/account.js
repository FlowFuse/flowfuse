import userApi from '@/api/user'
import router from "@/routes"

// initial state
const state = () => ({
    pending: true,
    user: null
})

// getters
const getters = {
    user(state) {
        return state.user
    }

}

// actions
const actions = {
    async checkState(state, redirectToUserSettings) {
        userApi.getUser().then(user => {
            state.commit('login', user.data)
            if (redirectToUserSettings) {
                // If this is a user-driven login, take them to the profile page
                router.push("/account/settings")
            }
        }).catch(_ => {
            // Not logged in
            state.commit('clearPending')
            router.push("/")
        })
    },

    async login(state, credentials) {
        try {
            await userApi.login(credentials.username,credentials.password,credentials.remember)
            state.dispatch('checkState',true);
        } catch(err) {
            console.log("LOGIN FAILED")
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

const mutations = {
    clearPending(state) {
        state.pending = false;
    },
    login(state, user) {
        state.pending = false;
        state.user = user;
    },
    logout(state) {
        state.pending = true;
        state.user = null
    }
}

export default {
    namespaced: true,
    state,
    getters,
    actions,
    mutations
}
