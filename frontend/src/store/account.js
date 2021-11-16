import userApi from '@/api/user'
import teamApi from '@/api/team'
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
    // The active team
    team: null,
    // The user's teams
    teams: [],
    // An error during login
    loginError: null,
    //
    pendingTeamChange: false
})

// getters
const getters = {
    user(state) {
        return state.user
    },
    teams(state) {
        return state.teams
    },
    team(state) {
        return state.team
    },
    redirectUrlAfterLogin(state) {
        return state.redirectUrlAfterLogin
    },
    pending(state) {
        return state.pending
    },
    pendingTeamChange(state) {
        return state.pendingTeamChange
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
        state.user = null;
        state.teams = [];
        state.team = null;
    },
    setUser(state,user) {
        state.user = user
    },
    setTeam(state, team) {
        state.team = team;
    },
    setTeams(state, teams) {
        state.teams = teams;
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
    },
    setPendingTeamChange(state) {
        state.pendingTeamChange = true;
    },
    clearPendingTeamChange(state) {
        state.pendingTeamChange = false;
    }
}

// actions
const actions = {
    async checkState(state,redirectUrlAfterLogin) {
        try {
            const user = await userApi.getUser();
            state.commit('login', user)

            const teams = await teamApi.getTeams();
            state.commit('setTeams', teams.teams)

            if (router.currentRoute.value.meta.requiresLogin === false) {
                // This is only for logged-out users
                window.location = "/"
                return;
            }

            if (teams.count === 0) {
                state.commit('clearPending')
                if (/^\/team\//.test(router.currentRoute.value.path)) {
                    router.push({ name: "Home" });
                    // router.push({
                    //     name: "PageNotFound",
                    //     params: { pathMatch: router.currentRoute.value.path.substring(1).split('/') },
                    //     // preserve existing query and hash if any
                    //     query: router.currentRoute.value.query,
                    //     hash: router.currentRoute.value.hash,
                    // })
                }

                return;
            }

            // Default to first in list - TODO: let the user pick their default
            let teamSlug = teams.teams[0].slug;
            //
            let teamIdMatch = /^\/team\/([^\/]+)($|\/)/.exec(redirectUrlAfterLogin || router.currentRoute.value.path)
            if (teamIdMatch) {
                teamSlug = teamIdMatch[1]
            // } else {
            //     let projectIdMatch = /^\/projects\/([^\/]+)($|\/)/.exec(redirectUrlAfterLogin || router.currentRoute.value.path)
            //     if (projectIdMatch) {
            //         let projectId = projectIdMatch[1]
            //
            //     }
            //
            //
            }

            try {
                const team = await teamApi.getTeam({slug:teamSlug})
                state.commit('setTeam', team);
                state.commit('clearPending')
                if (redirectUrlAfterLogin) {
                    // If this is a user-driven login, take them to the profile page
                    router.push(redirectUrlAfterLogin)
                }
            } catch(teamLoadErr) {
                state.commit('clearPending')
                // This means the team doesn't exist, or the user doesn't have access
                router.push({
                    name: "PageNotFound",
                    params: { pathMatch: router.currentRoute.value.path.substring(1).split('/') },
                    // preserve existing query and hash if any
                    query: router.currentRoute.value.query,
                    hash: router.currentRoute.value.hash,
                })
            }
        } catch(err) {
            // Not logged in
            state.commit('clearPending')
            if (router.currentRoute.value.meta.requiresLogin !== false) {
                state.commit('setRedirectUrl',router.currentRoute.value.fullPath);
                router.push({name:"Home"})
            }
        }
    },
    async refreshTeam(state) {
        const currentTeam = state.getters.team;
        if (currentTeam) {
            const team = await teamApi.getTeam(currentTeam.id);
            state.commit('setTeam', team)
        }
    },
    async refreshTeams(state) {
        const teams = await teamApi.getTeams();
        state.commit('setTeams', teams.teams)
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
                window.location = "/"
            })
    },
    async setTeam(state, team) {
        const currentTeam = state.getters.team;
        if (typeof team === 'string') {
            if (!currentTeam || currentTeam.slug !== team) {
                state.commit("setPendingTeamChange");
                team = await teamApi.getTeam({slug:team})
                state.commit("clearPendingTeamChange");
            } else {
                return
            }
        } else {
            if (!currentTeam || currentTeam.id === team.id) {
                return;
            }
        }
        state.commit("setTeam", team);
    },
    async setUser(state, user) {
        state.commit("setUser",user);
    }
}

export default {
    namespaced: true,
    state,
    getters,
    actions,
    mutations
}
