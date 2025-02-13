import { nextTick } from 'vue'

import flowBlueprintsApi from '../api/flowBlueprints.js'

import settingsApi from '../api/settings.js'
import teamApi from '../api/team.js'
import userApi from '../api/user.js'
import router from '../routes.js'
import product from '../services/product.js'

import commonActions from './common/actions.js'
import commonMutations from './common/mutations.js'

// initial state
const initialState = () => ({
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
    invitations: [],
    // An error during login
    loginError: null,
    //
    pendingTeamChange: false,
    // As an SPA, if we get a network error we should present
    // a suitable 'offline' message.
    offline: null,

    teamBlueprints: {}
})

const meta = {
    persistence: {
        redirectUrlAfterLogin: {
            storage: 'localStorage'
            // clearOnLogout: true (cleared by default)
        },
        features: {
            storage: 'localStorage'
        },
        teamMembership: {
            storage: 'sessionStorage'
        },
        team: {
            storage: 'sessionStorage'
        }
    }
}

const state = initialState

// getters
const getters = {
    ...commonMutations,
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
    noBilling (state, getters) {
        return !state.user.admin &&
        state.features.billing &&
        (!state.team?.billing?.unmanaged) &&
        (!getters.isTrialAccount || state.team?.billing?.trialEnded) &&
        !state.team?.billing?.active
    },
    isTrialAccount (state) {
        return !!state.team?.billing?.trial
    },
    isAdminUser: (state) => !!state.user.admin,
    defaultUserTeam: (state, getters) => {
        const defaultTeamId = state.user.defaultTeam || getters.teams[0]?.id
        return state.teams.find(team => team.id === defaultTeamId)
    },
    canCreateTeam (state, getters) {
        if (getters.isAdminUser) {
            return true
        }

        return Object.prototype.hasOwnProperty.call(getters.settings, 'team:create') &&
            getters.settings['team:create']
    },
    blueprints: state => state.teamBlueprints[state.team?.id] || [],
    defaultBlueprint: (state, getters) => getters.blueprints?.find(blueprint => blueprint.default),

    notifications: state => state.notifications,
    notificationsCount: state => state.notifications?.length || 0,
    unreadNotificationsCount: state => {
        const unread = state.notifications?.filter(n => !n.read) || []
        let count = unread.length || 0
        // check data.meta.counter for any notifications that have been grouped
        unread.forEach(n => {
            if (n.data.meta?.counter && typeof n.data.meta.counter === 'number' && n.data.meta.counter > 1) {
                count += n.data.meta.counter - 1 // decrement by 1 as the first notification is already counted
            }
        })
        return count
    },
    hasNotifications: (state, getters) => getters.notificationsCount > 0,

    teamInvitations: state => state.invitations,
    teamInvitationsCount: state => state.invitations?.length || 0,
    hasAvailableTeams: state => state.teams.length > 0,

    featuresCheck: (state) => {
        const preCheck = {
            // Instances
            isHostedInstancesEnabledForTeam: ((state) => {
                if (!state.team) {
                    return false
                }

                // // dashboard users don't receive the team.type in the response payload
                if (state.teamMembership?.role === 5 && !state.team?.type?.properties) {
                    return true
                }

                let available = false

                // loop over the different instance types
                for (const instanceType of Object.keys(state.team.type.properties?.instances) || []) {
                    if (state.team.type.properties?.instances[instanceType].active) {
                        available = true
                        break
                    }
                }
                return available
            })(state),

            // Shared Library
            isSharedLibraryFeatureEnabledForTeam: ((state) => {
                const flag = state.team?.type?.properties?.features?.['shared-library']
                return flag === undefined || flag
            })(state),
            isSharedLibraryFeatureEnabledForPlatform: state.features?.['shared-library'],

            // Blueprints
            isBlueprintsFeatureEnabledForTeam: ((state) => {
                const flag = state.team?.type?.properties?.features?.flowBlueprints
                return flag === undefined || flag
            })(state),
            isBlueprintsFeatureEnabledForPlatform: !!state.features?.flowBlueprints,

            // Custom Catalogs
            isCustomCatalogsFeatureEnabledForPlatform: !!state.features?.customCatalogs,
            isCustomCatalogsFeatureEnabledForTeam: ((state) => {
                const flag = state.team?.type?.properties.features?.customCatalogs
                return flag === undefined || flag
            })(state),

            // Static Assets
            isStaticAssetFeatureEnabledForPlatform: !!state.features?.staticAssets,
            isStaticAssetsFeatureEnabledForTeam: !!state.team?.type?.properties?.features?.staticAssets,

            // HTTP BearerTokens
            isHTTPBearerTokensFeatureEnabledForPlatform: !!state.settings?.features.httpBearerTokens,
            isHTTPBearerTokensFeatureEnabledForTeam: !!state.team?.type?.properties.features.teamHttpSecurity,

            // BOM
            isBOMFeatureEnabledForPlatform: !!state.features?.bom,
            isBOMFeatureEnabledForTeam: !!state.team?.type?.properties?.features?.bom,

            // Timeline
            isTimelineFeatureEnabledForPlatform: !!state.features?.projectHistory,
            isTimelineFeatureEnabledForTeam: !!state.team?.type?.properties?.features?.projectHistory,

            // Mqtt Broker
            isMqttBrokerFeatureEnabledForPlatform: !!state.features?.teamBroker,
            isMqttBrokerFeatureEnabledForTeam: !!state.team?.type?.properties?.features?.teamBroker,

            isExternalMqttBrokerFeatureEnabledForPlatform: !!state.features?.externalBroker,

            // DevOps Pipelines
            devOpsPipelinesFeatureEnabledForPlatform: !!state.features?.['devops-pipelines']
        }
        return {
            ...preCheck,
            isSharedLibraryFeatureEnabled: preCheck.isSharedLibraryFeatureEnabledForTeam && preCheck.isSharedLibraryFeatureEnabledForPlatform,
            isBlueprintsFeatureEnabled: preCheck.isBlueprintsFeatureEnabledForTeam && preCheck.isBlueprintsFeatureEnabledForPlatform,
            isCustomCatalogsFeatureEnabled: preCheck.isCustomCatalogsFeatureEnabledForPlatform && preCheck.isCustomCatalogsFeatureEnabledForTeam,
            isStaticAssetFeatureEnabled: preCheck.isStaticAssetFeatureEnabledForPlatform && preCheck.isStaticAssetsFeatureEnabledForTeam,
            isHTTPBearerTokensFeatureEnabled: preCheck.isHTTPBearerTokensFeatureEnabledForPlatform && preCheck.isHTTPBearerTokensFeatureEnabledForTeam,
            isBOMFeatureEnabled: preCheck.isBOMFeatureEnabledForPlatform && preCheck.isBOMFeatureEnabledForTeam,
            isTimelineFeatureEnabled: preCheck.isTimelineFeatureEnabledForPlatform && preCheck.isTimelineFeatureEnabledForTeam,
            isMqttBrokerFeatureEnabled: preCheck.isMqttBrokerFeatureEnabledForPlatform && preCheck.isMqttBrokerFeatureEnabledForTeam,
            // external broker must be enabled for platform, and share the same team-level feature flag as the team broker
            isExternalMqttBrokerFeatureEnabled: preCheck.isExternalMqttBrokerFeatureEnabledForPlatform && preCheck.isMqttBrokerFeatureEnabledForTeam,
            devOpsPipelinesFeatureEnabled: preCheck.devOpsPipelinesFeatureEnabledForPlatform,
            isDeviceGroupsFeatureEnabled: !!state.team?.type?.properties?.features?.deviceGroups
        }
    }
}

const mutations = {
    ...commonMutations,
    setSettings (state, settings) {
        state.settings = settings
        state.features = settings.features || {}
    },
    clearPending (state) {
        state.pending = false
    },
    setPending (state, pending) {
        state.pending = pending
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
        state.redirectUrlAfterLogin = null
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
    setNotifications (state, notifications) {
        state.notifications = notifications
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
    },
    setTeamInvitations (state, invitations) {
        state.invitations = invitations
    }
}

// actions
const actions = {
    ...commonActions(initialState, meta, 'account'),
    async checkState ({ commit, dispatch }, redirectUrlAfterLogin) {
        try {
            const settings = await settingsApi.getSettings()
            commit('setSettings', settings)

            commit('setOffline', false)

            const user = await userApi.getUser()
            commit('login', user)
            dispatch('ux/checkIfIsNewlyCreatedUser', user, { root: true })

            // User is logged in
            if (router.currentRoute.value.meta.requiresLogin === false) {
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
            // check notifications count
            await dispatch('getInvitations')

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
                    name: 'page-not-found',
                    params: { pathMatch: router.currentRoute.value.path.substring(1).split('/') },
                    // preserve existing query and hash if any
                    query: router.currentRoute.value.query,
                    hash: router.currentRoute.value.hash
                })
            }
        } catch (err) {
            // Not logged in
            commit('clearPending')
            // do we have a user session to clear?
            if (state.user) {
                try {
                    window.posthog?.reset()
                } catch (err) {
                    console.error('posthog error resetting user')
                }
            }

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
            state.commit('setPending', true)
            state.dispatch('checkState', state.getters.redirectUrlAfterLogin)
        } catch (err) {
            if (err.response?.status >= 401) {
                state.commit('loginFailed', err.response.data)
            } else {
                console.error(err)
            }
        }
    },
    async logout ({ rootState, dispatch, commit }) {
        return userApi.logout()
            .then(async () => {
                // reset vuex stores to initial state
                const modules = Object.keys(rootState).filter(m => m)
                for (const module of modules) {
                    await dispatch(`${module}/$resetState`, null, { root: true })
                }
            })
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
            if ((!currentTeam && !team) || currentTeam?.id === team?.id) {
                state.commit('clearPendingTeamChange')
                return
            }
        }
        if (team?.id) {
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
        await userApi.getNotifications()
            .then((notifications) => {
                state.commit('setNotifications', notifications.notifications)
            })
            .catch(_ => {})
    },
    setNotifications (state, notifications) {
        state.commit('setNotifications', notifications)
    },
    async getInvitations (state) {
        await userApi.getTeamInvitations()
            .then((invitations) => {
                state.commit('setTeamInvitations', invitations.invitations)
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
    meta
}
