import { defineStore } from 'pinia'
import { nextTick } from 'vue'

import settingsApi from '../api/settings.js'
import teamApi from '../api/team.js'
import userApi from '../api/user.js'

import { useAccountSettingsStore } from '@/stores/account-settings.js'
import { useAccountTeamStore } from '@/stores/account-team.js'
import { useProductAssistantStore } from '@/stores/product-assistant.js'
import { useProductBrokersStore } from '@/stores/product-brokers.js'
import { useProductExpertInsightsAgentStore } from '@/stores/product-expert-insights-agent.js'
import { useProductExpertSupportAgentStore } from '@/stores/product-expert-support-agent.js'
import { useProductExpertStore } from '@/stores/product-expert.js'
import { useProductTablesStore } from '@/stores/product-tables.js'
import { useUxDialogStore } from '@/stores/ux-dialog.js'
import { useUxDrawersStore } from '@/stores/ux-drawers.js'
import { useUxNavigationStore } from '@/stores/ux-navigation.js'
import { useUxToursStore } from '@/stores/ux-tours.js'
import { useUxStore } from '@/stores/ux.js'

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
        },
        async checkState (redirectUrlAfterLogin) {
            // Lazy require to break circular: account-auth.js → routes.js → Home.vue → ... → account-auth.js
            const router = require('../routes.js').default
            // Ensure the initial navigation has resolved before reading router.currentRoute.
            // checkState is called from App.vue mounted(), which can fire before the router
            // finishes navigating to the initial URL. Without this, currentRoute may still be
            // at the START location ('/') and the redirect logic will silently do nothing.
            await router.isReady()
            try {
                const settings = await settingsApi.getSettings()
                useAccountSettingsStore().setSettings(settings)

                this.setOffline(false)

                const user = await userApi.getUser()
                this.login(user)
                useUxStore().checkIfIsNewlyCreatedUser(user)

                // User is logged in
                if (router.currentRoute.value.meta.requiresLogin === false) {
                    // This is only for logged-out users
                    window.location = '/'
                    return
                } else if (user.email_verified === false || user.password_expired) {
                    this.clearPending()
                    router.push({ name: 'Home' })
                    return
                }

                // check notifications count
                await useAccountTeamStore().getNotifications()
                // check notifications count
                await useAccountTeamStore().getInvitations()

                const teams = await teamApi.getTeams()
                useAccountTeamStore().setTeams(teams.teams)

                if (teams.count === 0) {
                    this.clearPending()
                    useAccountTeamStore().setTeam(null)
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
                        await useAccountTeamStore().setTeam(team)
                    }
                    this.clearPending()
                    if (redirectUrlAfterLogin) {
                        // If this is a user-driven login, take them to the profile page
                        router.push(redirectUrlAfterLogin)
                        // Clear the redirectUrl on nextTick
                        nextTick(() => { this.setRedirectUrl(null) })
                    }
                } catch (teamLoadErr) {
                    this.clearPending()
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
                this.clearPending()
                // do we have a user session to clear?
                if (this.user) {
                    try {
                        window.posthog?.reset()
                    } catch (err) {
                        console.error('posthog error resetting user')
                    }
                }

                if (router.currentRoute.value.meta.requiresLogin !== false) {
                    if (router.currentRoute.value.path !== '/') {
                        // Only remember the url if it isn't the default / path
                        this.setRedirectUrl(router.currentRoute.value.fullPath)
                    }
                    router.push({ name: 'Home' })
                }
            }
        },
        async loginWithCredentials (credentials) {
            try {
                this.setLoginInflight()
                if (credentials.username) {
                    await userApi.login(credentials.username, credentials.password)
                } else if (credentials.token) {
                    await userApi.verifyMFAToken(credentials.token)
                }
                this.setPending(true)
                this.checkState(this.redirectUrlAfterLogin)
            } catch (err) {
                if (err.response?.status >= 401) {
                    this.loginFailed(err.response.data)
                } else {
                    console.error(err)
                }
            }
        },
        async logout () {
            return userApi.logout()
                .then(() => {
                    useAccountAuthStore().$reset()
                    useAccountTeamStore().$reset()
                    useAccountSettingsStore().$reset()
                    useUxDialogStore().$reset()
                    useUxToursStore().$reset()
                    useUxNavigationStore().$reset()
                    useUxDrawersStore().$reset()
                    useUxStore().$reset()
                    // Lazy require to break circular: account-auth.js → context.js → account-auth.js
                    require('@/stores/context.js').useContextStore().$reset()
                    useProductTablesStore().$reset()
                    useProductBrokersStore().$reset()
                    useProductAssistantStore().$reset()
                    useProductExpertSupportAgentStore().$reset()
                    useProductExpertInsightsAgentStore().$reset()
                    useProductExpertStore().$reset()
                })
                .catch(_ => {})
                .finally(() => {
                    if (window._hsq) {
                        window._hsq.push(['revokeCookieConsent'])
                    }
                    window.location = '/'
                })
        }
    },
    persist: {
        pick: ['redirectUrlAfterLogin'],
        storage: localStorage
    }
})
