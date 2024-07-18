import { nextTick } from 'vue'

import flowBlueprintsApi from '../api/flowBlueprints.js'

import settingsApi from '../api/settings.js'
import teamApi from '../api/team.js'
import userApi from '../api/user.js'
import router from '../routes.js'
import product from '../services/product.js'

// initial state
const state = () => ({
    // Runtime settings
    settings: null,
    // Feature flags
    features: {},
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
    // The active user's membership details of the active team
    teamMembership: null,
    // The user's teams
    teams: [],
    // stores active notifications that require user attention, key'd by notification type (e.g. invites) alongside a payload bucket to store all notifications
    notifications: {
        payload: []
    },
    // An error during login
    loginError: null,
    //
    pendingTeamChange: false,
    // As an SPA, if we get a network error we should present
    // a suitable 'offline' message.
    offline: null,

    teamBlueprints: {}
})

// getters
const getters = {
    settings (state) {
        return state.settings
    },
    user (state) {
        return state.user
    },
    teams (state) {
        return state.teams
    },
    team (state) {
        return state.team
    },
    teamMembership (state) {
        return state.teamMembership
    },
    notifications (state) {
        const n = { ...state.notifications }

        let sum = 0
        for (const type of Object.keys(n)) {
            if (!['total', 'payload'].includes(type)) {
                sum += n[type]
            }
        }

        n.total = sum

        return n
    },
    totalNotificationsCount: (state, getters) => getters.notifications.total,
    redirectUrlAfterLogin (state) {
        return state.redirectUrlAfterLogin
    },
    pending (state) {
        return state.pending
    },
    pendingTeamChange (state) {
        return state.pendingTeamChange
    },
    offline (state) {
        return state.offline
    },
    isAdminUser: (state) => !!state.user.admin,
    defaultUserTeam: (state, getters) => {
        const defaultTeamId = state.user.defaultTeam || getters.teams[0]?.id
        return state.teams.find(team => team.id === defaultTeamId)
    },
    blueprints: state => state.teamBlueprints[state.team?.id] || [],
    defaultBlueprint: (state, getters) => getters.blueprints?.find(blueprint => blueprint.default),
    hasNotifications: (state, getters) => getters.notifications.total > 0,
    teamInvitations: state => state.notifications.payload // filter out team invites by notification.type = invite
}

const mutations = {
    setSettings (state, settings) {
        state.settings = settings
        state.features = settings.features || {}
    },
    clearPending (state) {
        state.pending = false
    },
    setLoginInflight (state) {
        state.loginInflight = true
    },
    login (state, user) {
        state.loginInflight = false
        state.user = user
    },
    logout (state) {
        state.loginInflight = false
        state.pending = true
        state.user = null
        state.teams = []
        state.team = null
    },
    setUser (state, user) {
        state.user = user
    },
    setTeam (state, team) {
        // update the product session "team" to record all future events against them
        product.setTeam(team)
        state.team = team
    },
    setTeamMembership (state, membership) {
        state.teamMembership = membership
    },
    setTeams (state, teams) {
        state.teams = teams
    },
    setNotificationsCount (state, payload) {
        state.notifications[payload.type] = payload.count
    },
    setNotificationsPayload (state, notifications) {
        state.notifications.payload = notifications
    },
    sessionExpired (state) {
        state.user = null
    },
    loginFailed (state, error) {
        state.loginInflight = false
        state.loginError = error
    },
    setRedirectUrl (state, url) {
        state.redirectUrlAfterLogin = url
    },
    setPendingTeamChange (state) {
        state.pendingTeamChange = true
    },
    clearPendingTeamChange (state) {
        state.pendingTeamChange = false
    },
    setOffline (state, value) {
        state.offline = value
    },
    setTeamBlueprints (state, { teamId, blueprints }) {
        state.teamBlueprints[teamId] = blueprints
    }
}

// actions
const actions = {
    async checkState ({ commit, dispatch }, redirectUrlAfterLogin) {
        try {
            const settings = await settingsApi.getSettings()
            commit('setSettings', settings)

            commit('setOffline', false)

            const user = await userApi.getUser()
            commit('login', user)

            // User is logged in
            if (router.currentRoute.value.name === 'VerifyEmail' && user.email_verified === false) {
                // This page has `meta.requiresLogin = false` as it needs to be
                // accessible to non-logged-in users.
                // By default, we redirect away from those pages for logged in users,
                // however this is the one exception that should be allowed to
                // continue.
            } else if (router.currentRoute.value.meta.requiresLogin === false) {
                // This is only for logged-out users
                window.location = '/'
                return
            } else if (user.email_verified === false || user.password_expired) {
                commit('clearPending')
                router.push({ name: 'Home' })
                return
            }

            // check notifications count
            await dispatch('getNotifications')

            const teams = await teamApi.getTeams()
            commit('setTeams', teams.teams)

            if (teams.count === 0) {
                commit('clearPending')
                commit('setTeam', null)
                if (/^\/team\//.test(router.currentRoute.value.path)) {
                    router.push({ name: 'Home' })
                }

                return
            }

            try {
                // We now check to see if we know what team the user is currently
                // accessing and load it.
                // Some routes handle this for themselves in their setup based
                // on the object the user is trying to access:
                //  - /application/XYZ/
                //  - /device/XYZ/
                //  - /instance/XYZ
                // They call `setTeam` once they have identified the owning team
                // of the object being accessed.
                if (!/^\/(application|device|instance)\//.test(redirectUrlAfterLogin || router.currentRoute.value.path)) {
                    // Assume we'll load the users default team, or the first in their team list
                    // if no default has been set
                    let teamId = user.defaultTeam || teams.teams[0].id
                    let teamSlug = null

                    // Check the url to see if it is a /team/XYZ path - which
                    // identifies the team we should try to load instead
                    const teamIdMatch = /^\/team\/([^/]+)($|\/)/.exec(redirectUrlAfterLogin || router.currentRoute.value.path)
                    if (teamIdMatch && teamIdMatch[1] !== 'create') {
                        teamId = null
                        teamSlug = teamIdMatch[1]
                    }
                    const team = await teamApi.getTeam(teamId || { slug: teamSlug })
                    const teamMembership = await teamApi.getTeamUserMembership(team.id)
                    commit('setTeam', team)
                    commit('setTeamMembership', teamMembership)
                }
                commit('clearPending')
                if (redirectUrlAfterLogin) {
                    // If this is a user-driven login, take them to the profile page
                    router.push(redirectUrlAfterLogin)
                    // Clear the redirectUrl on nextTick
                    nextTick(() => { commit('setRedirectUrl', null) })
                }
            } catch (teamLoadErr) {
                commit('clearPending')
                // This means the team doesn't exist, or the user doesn't have access
                router.push({
                    name: 'PageNotFound',
                    params: { pathMatch: router.currentRoute.value.path.substring(1).split('/') },
                    // preserve existing query and hash if any
                    query: router.currentRoute.value.query,
                    hash: router.currentRoute.value.hash
                })
            }
        } catch (err) {
            // Not logged in
            commit('clearPending')
            window.posthog?.reset()

            if (router.currentRoute.value.meta.requiresLogin !== false) {
                if (router.currentRoute.value.path !== '/') {
                    // Only remember the url if it isn't the default / path
                    commit('setRedirectUrl', router.currentRoute.value.fullPath)
                }
                router.push({ name: 'Home' })
            }
        }
    },
    async refreshTeam (state) {
        const currentTeam = state.getters.team
        if (currentTeam) {
            const currentSlug = currentTeam.slug
            const team = await teamApi.getTeam(currentTeam.id)
            const teamMembership = await teamApi.getTeamUserMembership(team.id)
            state.commit('setTeam', team)
            state.commit('setTeamMembership', teamMembership)
            if (currentSlug !== team.slug) {
                router.replace({ name: router.currentRoute.value.name, params: { team_slug: team.slug } })
            }
        }
    },
    async refreshTeams (state) {
        const teams = await teamApi.getTeams()
        state.commit('setTeams', teams.teams)
    },
    async login (state, credentials) {
        try {
            state.commit('setLoginInflight')
            if (credentials.username) {
                await userApi.login(credentials.username, credentials.password)
            } else if (credentials.token) {
                await userApi.verifyMFAToken(credentials.token)
            }
            state.dispatch('checkState', state.getters.redirectUrlAfterLogin)
        } catch (err) {
            if (err.response?.status >= 401) {
                state.commit('loginFailed', err.response.data)
            } else {
                console.error(err)
            }
        }
    },
    async logout (state) {
        state.commit('logout')
        userApi.logout()
            .catch(_ => {})
            .finally(() => {
                if (window._hsq) {
                    window._hsq.push(['revokeCookieConsent'])
                }
                window.location = '/'
            })
    },
    async setTeam (state, team) {
        const currentTeam = state.getters.team
        state.commit('setPendingTeamChange')
        let teamMembership
        if (typeof team === 'string') {
            if (!currentTeam || currentTeam.slug !== team) {
                team = await teamApi.getTeam({ slug: team })
            } else {
                state.commit('clearPendingTeamChange')
                return
            }
        } else {
            if (!currentTeam || currentTeam.id === team.id) {
                state.commit('clearPendingTeamChange')
                return
            }
        }
        if (team.id) {
            teamMembership = await teamApi.getTeamUserMembership(team.id)
        }
        state.commit('setTeam', team)
        state.commit('setTeamMembership', teamMembership)
        state.commit('clearPendingTeamChange')
    },
    async setUser (state, user) {
        state.commit('setUser', user)
    },
    async refreshSettings (state) {
        const settings = await settingsApi.getSettings()
        state.commit('setSettings', settings)
    },
    setOffline (state, value) {
        state.commit('setOffline', value)
    },
    async getTeamBlueprints (state, teamId) {
        const response = await flowBlueprintsApi.getFlowBlueprintsForTeam(teamId)
        const blueprints = response.blueprints

        return state.commit('setTeamBlueprints', { teamId, blueprints })
    },
    setRedirectUrl (state, url) {
        state.commit('setRedirectUrl', url)
    },
    async getNotifications (state) {
        await userApi.getTeamInvitations()
            .then((invitations) => {
                state.commit('setNotificationsCount', {
                    type: 'invitations',
                    count: invitations.count
                })
                state.commit('setNotificationsPayload', invitations.invitations)
            })
            .catch(_ => {})
    }
}

export default {
    namespaced: true,
    state,
    getters,
    actions,
    mutations,
    meta: {
        persistence: {
            redirectUrlAfterLogin: {
                storage: 'localStorage'
            }
        }
    }
}
