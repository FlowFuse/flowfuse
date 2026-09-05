import { defineStore } from 'pinia'
import { v4 as uuidv4 } from 'uuid'
import { nextTick } from 'vue'

import settingsApi from '../api/settings.js'
import teamApi from '../api/team.js'
import userApi from '../api/user.js'
import { setLocale } from '../i18n.js'
import { handoffFromPopup, isPopupContext } from '../utils/popupContext.js'

import getAppOrchestrator from '@/services/app.orchestrator'
import { useAccountSettingsStore } from '@/stores/account-settings.js'
import { useAccountStore } from '@/stores/account.js'
import { useContextStore } from '@/stores/context.js'
import { useCookieConsentStore } from '@/stores/cookie-consent'
import { useDataFarmApplicationsStore } from '@/stores/data-farm-applications'
import { useDataFarmHostedInstancesStore } from '@/stores/data-farm-hosted-instances'
import { useDataFarmTeamsStore } from '@/stores/data-farm-teams'
import { useProductAssistantStore } from '@/stores/product-assistant.js'
import { useProductBrokersStore } from '@/stores/product-brokers.js'
import { useProductExpertInsightsAgentStore } from '@/stores/product-expert-insights-agent.js'
import { useProductExpertSupportAgentStore } from '@/stores/product-expert-support-agent.js'
import { useProductExpertStore } from '@/stores/product-expert.js'
import { useProductTablesStore } from '@/stores/product-tables.js'
import { useUxDialogStore } from '@/stores/ux-dialog.js'
import { useUxDrawersStore } from '@/stores/ux-drawers.js'
import { useUxLoadingStore } from '@/stores/ux-loading.js'
import { useUxNavigationStore } from '@/stores/ux-navigation.js'
import { useUxToursStore } from '@/stores/ux-tours.js'
import { useUxStore } from '@/stores/ux.js'

/**
 * Apply a user's stored language preference, if they expressed one.
 *
 * A user with no preference is left on whatever locale was negotiated from the
 * browser at startup — this must not quietly reset them to English.
 *
 * @param {object} [user] a user profile as returned by the API
 */
function applyUserLocale (user) {
    if (user?.language) {
        setLocale(user.language)
    }
}

export const useAccountAuthStore = defineStore('account-auth', {
    state: () => ({
        user: null,
        loginInflight: false,
        loginError: null,
        redirectUrlAfterLogin: null,
        sessionId: null
    }),
    getters: {
        isAdminUser: (state) => !!state.user?.admin
    },
    actions: {
        getSessionId () {
            if (!this.sessionId) this.sessionId = uuidv4()
            return this.sessionId
        },
        login (user) {
            this.user = user
            applyUserLocale(user)
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
            applyUserLocale(user)
        },
        setRedirectUrl (url) {
            this.redirectUrlAfterLogin = url
        },
        async disconnectSubscribers () {
            const subscribers = getAppOrchestrator().$subscribers
            await Promise.all(
                Object.values(subscribers).map(subscriber => subscriber?.disconnect().catch(() => {}))
            )
        },
        async checkIfAuthenticated () {
            const user = await userApi.getUser()
            this.user = user
            applyUserLocale(user)
        },
        async checkState (redirectUrlAfterLogin) {
            // Lazy require to break circular: account-auth.js → routes.js → Home.vue → ... → account-auth.js
            const router = require('../routes.js').default
            try {
                const settings = await settingsApi.getSettings()
                useAccountSettingsStore().setSettings(settings)

                useUxLoadingStore().setOffline(false)

                const user = await userApi.getUser()
                this.login(user)
                useUxStore().checkIfIsNewlyCreatedUser(user)

                // User is logged in
                if (router.currentRoute.value.meta.requiresLogin === false) {
                    // This is only for logged-out users
                    if (isPopupContext(router.currentRoute.value.query)) {
                        handoffFromPopup('/')
                        return
                    }
                    window.location = '/'
                    return
                } else if (user.email_verified === false || user.password_expired) {
                    useUxLoadingStore().clearAppLoader()
                    router.push({ name: 'home' })
                    return
                }

                // check notifications count
                await useAccountStore().getNotifications()
                // check notifications count
                await useAccountStore().getInvitations()

                const teams = await useDataFarmTeamsStore().fetchTeamList()

                if (teams.length === 0) {
                    useUxLoadingStore().clearAppLoader()
                    useAccountStore().setTeam(null)
                    if (/^\/team\//.test(router.currentRoute.value.path)) {
                        router.push({ name: 'home' })
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
                        let teamId = user.defaultTeam || teams[0].id
                        let teamSlug = null

                        // Check the url to see if it is a /team/XYZ path - which
                        // identifies the team we should try to load instead
                        const teamIdMatch = /^\/team\/([^/]+)($|\/)/.exec(redirectUrlAfterLogin || router.currentRoute.value.path)
                        if (teamIdMatch && teamIdMatch[1] !== 'create') {
                            teamId = null
                            teamSlug = teamIdMatch[1]
                        }
                        const team = await teamApi.getTeam(teamId || { slug: teamSlug })
                        await useAccountStore().setTeam(team)
                    }
                    useUxLoadingStore().clearAppLoader()
                    if (redirectUrlAfterLogin) {
                        // If this is a user-driven login, take them to the profile page
                        router.push(redirectUrlAfterLogin)
                        // Clear the redirectUrl on nextTick
                        nextTick(() => { this.setRedirectUrl(null) })
                    }
                } catch (teamLoadErr) {
                    useUxLoadingStore().clearAppLoader()
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
                useUxLoadingStore().clearAppLoader()
                // do we have a user session to clear?
                if (this.user) {
                    try {
                        window.posthog?.reset()
                    } catch (err) {
                        console.error('posthog error resetting user')
                    }
                }

                useProductExpertSupportAgentStore().$reset()
                useProductExpertInsightsAgentStore().$reset()
                useProductExpertStore().$reset()

                if (router.currentRoute.value.meta.requiresLogin !== false) {
                    const currentPath = router.currentRoute.value.fullPath === '/'
                        ? window.location.pathname + window.location.search + window.location.hash
                        : router.currentRoute.value.fullPath
                    if (currentPath !== '/') {
                        // Only remember the url if it isn't the default / path
                        this.setRedirectUrl(currentPath)
                    }
                    // if (router.currentRoute.value.path !== '/') {
                    //     // Only remember the url if it isn't the default / path
                    //     this.setRedirectUrl(router.currentRoute.value.fullPath)
                    // }
                    router.push({ name: 'home' })
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
                useUxLoadingStore().setAppLoader(true)
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
            let logoutURL = '/'
            if (useAccountSettingsStore().settings['platform:sso:only']) {
                logoutURL = useAccountSettingsStore().settings['platform:sso:only:logoutURL'] || '/'
            }
            return this.disconnectSubscribers()
                .then(() => userApi.logout())
                .then(() => this.clearStores())
                .catch(_ => {})
                .finally(() => {
                    if (window._hsq) {
                        window._hsq.push(['revokeCookieConsent'])
                    }
                    window.location = logoutURL
                })
        },
        clearStores () {
            useAccountAuthStore().$reset()
            useAccountStore().$reset()
            useUxLoadingStore().$reset()
            useAccountSettingsStore().$reset()
            useUxDialogStore().$reset()
            useUxToursStore().$reset()
            useUxNavigationStore().$reset()
            useUxDrawersStore().$reset()
            useUxStore().$reset()
            useContextStore().$reset()
            useCookieConsentStore().reset()
            useDataFarmApplicationsStore().reset()
            useDataFarmHostedInstancesStore().reset()
            useDataFarmTeamsStore().reset()
            useProductTablesStore().$reset()
            useProductBrokersStore().$reset()
            useProductAssistantStore().$reset()
            useProductExpertSupportAgentStore().$reset()
            useProductExpertInsightsAgentStore().$reset()
            useProductExpertStore().$reset()
        }
    },
    persist: [
        {
            pick: ['redirectUrlAfterLogin'],
            storage: localStorage
        },
        {
            pick: ['sessionId'],
            storage: sessionStorage
        }
    ]
})
