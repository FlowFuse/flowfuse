import { getActivePinia } from 'pinia'
import { nextTick } from 'vue'

import settingsApi from '../../../api/settings.js'
import teamApi from '../../../api/team.js'
import userApi from '../../../api/user.js'
import { getTeamProperty } from '../../../composables/TeamProperties.js'
import router from '../../../routes.js'

import { useAccountAuthStore } from '@/stores/account-auth.js'
import { useAccountTeamStore } from '@/stores/account-team.js'
import { useContextStore } from '@/stores/context.js'
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

// initial state
const initialState = () => ({
    // Runtime settings
    settings: null,
    // Feature flags
    features: {}
})

const meta = {
    persistence: {
        settings: {
            storage: 'localStorage',
            clearOnLogout: false
        },
        features: {
            storage: 'localStorage',
            clearOnLogout: false
        }
    }
}

const state = initialState

// getters
const getters = {
    settings (state) {
        return state.settings
    },
    requiresBilling (state, getters) {
        const { user } = useAccountAuthStore()
        const { team, isTrialAccount } = useAccountTeamStore()
        const isNotAdmin = (user && !user.admin)

        return isNotAdmin &&
        state.features.billing &&
        (!team?.billing?.unmanaged) &&
        (!isTrialAccount || team?.billing?.trialEnded) &&
        !team?.type?.properties?.billing?.disabled &&
        !team?.billing?.active
    },
    isBillingEnabled (state) {
        return !!state.features.billing
    },
    canCreateTeam (state, getters) {
        if (useAccountAuthStore().isAdminUser) {
            return true
        }

        return Object.prototype.hasOwnProperty.call(getters.settings, 'team:create') &&
            getters.settings['team:create']
    },
    featuresCheck: (state) => {
        const { teamMembership, team } = useAccountTeamStore()

        const preCheck = {
            // Instances
            // deprecated, use the isFreeTeamType getter
            isHostedInstancesEnabledForTeam: (() => {
                if (!team) {
                    return false
                }

                // // dashboard users don't receive the team.type in the response payload
                if (teamMembership?.role === 5 && !team?.type?.properties) {
                    return true
                }

                let available = false

                // loop over the different instance types. Reference the team type properties to get the list
                // of instance types, but use getTeamProperty to check the individual types to take into account
                // any team level overrides
                for (const instanceType of Object.keys(team.type.properties?.instances) || []) {
                    if (getTeamProperty(team, `instances.${instanceType}.active`)) {
                        available = true
                        break
                    }
                }
                return available
            })(state),

            // Shared Library
            isSharedLibraryFeatureEnabledForTeam: (() => {
                const flag = team?.type?.properties?.features?.['shared-library']
                return (flag === undefined || flag) || team?.type?.properties?.enableAllFeatures
            })(state),
            isSharedLibraryFeatureEnabledForPlatform: state.features?.['shared-library'],

            // Blueprints
            isBlueprintsFeatureEnabledForTeam: (() => {
                const flag = team?.type?.properties?.features?.flowBlueprints
                return (flag === undefined || flag) || team?.type?.properties?.enableAllFeatures
            })(state),
            isBlueprintsFeatureEnabledForPlatform: !!state.features?.flowBlueprints,

            // Custom Catalogs
            isCustomCatalogsFeatureEnabledForPlatform: !!state.features?.customCatalogs,
            isCustomCatalogsFeatureEnabledForTeam: (() => {
                const flag = team?.type?.properties.features?.customCatalogs
                return (flag === undefined || flag) || team?.type?.properties?.enableAllFeatures
            })(state),

            // Private NPM Registry (Custom Nodes)
            isPrivateRegistryFeatureEnabledForPlatform: !!state.features?.npm,
            isPrivateRegistryFeatureEnabledForTeam: !!team?.type?.properties?.features?.npm || team?.type?.properties?.enableAllFeatures,

            // Certified Nodes
            isCertifiedNodesFeatureEnabledForPlatform: !!state.features?.certifiedNodes,
            // FlowFuse Nodes
            isFlowFuseNodesFeatureEnabledForPlatform: !!state.features?.ffNodes,

            // Static Assets
            isStaticAssetFeatureEnabledForPlatform: !!state.features?.staticAssets,
            isStaticAssetsFeatureEnabledForTeam: !!team?.type?.properties?.features?.staticAssets || team?.type?.properties?.enableAllFeatures,

            // HTTP BearerTokens
            isHTTPBearerTokensFeatureEnabledForPlatform: !!state.settings?.features.httpBearerTokens,
            isHTTPBearerTokensFeatureEnabledForTeam: !!team?.type?.properties.features.teamHttpSecurity || team?.type?.properties?.enableAllFeatures,

            // BOM
            isBOMFeatureEnabledForPlatform: !!state.features?.bom,
            isBOMFeatureEnabledForTeam: !!team?.type?.properties?.features?.bom || team?.type?.properties?.enableAllFeatures,

            // Timeline
            isTimelineFeatureEnabledForPlatform: !!state.features?.projectHistory,
            isTimelineFeatureEnabledForTeam: !!team?.type?.properties?.features?.projectHistory || team?.type?.properties?.enableAllFeatures,

            // Mqtt Broker
            isMqttBrokerFeatureEnabledForPlatform: !!state.features?.teamBroker,
            isMqttBrokerFeatureEnabledForTeam: !!team?.type?.properties?.features?.teamBroker || team?.type?.properties?.enableAllFeatures,

            isExternalMqttBrokerFeatureEnabledForPlatform: !!state.features?.externalBroker,

            // DevOps Pipelines
            devOpsPipelinesFeatureEnabledForPlatform: !!state.features?.['devops-pipelines'],

            isGitIntegrationFeatureEnabledForPlatform: !!state.features?.gitIntegration,

            // Instance Resources
            isInstanceResourcesFeatureEnabledForPlatform: !!state.features?.instanceResources,
            isInstanceResourcesFeatureEnabledForTeam: !!team?.type?.properties?.features?.instanceResources || team?.type?.properties?.enableAllFeatures,

            // Tables
            isTablesFeatureEnabledForPlatform: !!state.features.tables,
            isTablesFeatureEnabledForTeam: !!team?.type?.properties?.features?.tables || team?.type?.properties?.enableAllFeatures,

            // Generate Snapshot Descriptions with AI
            isGeneratedSnapshotDescriptionFeatureEnabledForPlatform: !!state.features.generatedSnapshotDescription,
            isGeneratedSnapshotDescriptionFeatureEnabledForTeam: !!team?.type?.properties?.features?.generatedSnapshotDescription || team?.type?.properties?.enableAllFeatures,

            // Applications Role Based Access Control
            isApplicationsRBACFeatureEnabledForPlatform: !!state.features.rbacApplication,
            isApplicationsRBACFeatureEnabledForTeam: !!team?.type?.properties?.features?.rbacApplication || team?.type?.properties?.enableAllFeatures,

            // Expert Assistant
            isExpertAssistantFeatureEnabledForPlatform: !!state.features.expertAssistant,

            // Instance Maintenance
            isInstanceAutoStackUpdateFeatureEnabledForPlatform: !!state.features.autoStackUpdate
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
            isDeviceGroupsFeatureEnabled: !!team?.type?.properties?.features?.deviceGroups || !!team?.type?.properties?.enableAllFeatures,
            isGitIntegrationFeatureEnabled: preCheck.isGitIntegrationFeatureEnabledForPlatform && !!team?.type?.properties?.features?.gitIntegration,
            isInstanceResourcesFeatureEnabled: preCheck.isInstanceResourcesFeatureEnabledForPlatform && preCheck.isInstanceResourcesFeatureEnabledForTeam,
            isTablesFeatureEnabled: preCheck.isTablesFeatureEnabledForPlatform && preCheck.isTablesFeatureEnabledForTeam,
            isGeneratedSnapshotDescriptionEnabled: preCheck.isGeneratedSnapshotDescriptionFeatureEnabledForPlatform && preCheck.isGeneratedSnapshotDescriptionFeatureEnabledForTeam,
            isRBACApplicationFeatureEnabled: preCheck.isApplicationsRBACFeatureEnabledForPlatform && preCheck.isApplicationsRBACFeatureEnabledForTeam,
            isExpertAssistantFeatureEnabled: preCheck.isExpertAssistantFeatureEnabledForPlatform
        }
    }
}

// mutations
const mutations = {
    setSettings (state, settings) {
        state.settings = settings
        state.features = settings.features || {}
    }
}

// actions
const actions = {
    async checkState ({ commit }, redirectUrlAfterLogin) {
        try {
            const settings = await settingsApi.getSettings()
            commit('setSettings', settings)

            useAccountAuthStore().setOffline(false)

            const user = await userApi.getUser()
            useAccountAuthStore().login(user)
            useUxStore().checkIfIsNewlyCreatedUser(user)

            // User is logged in
            if (router.currentRoute.value.meta.requiresLogin === false) {
                // This is only for logged-out users
                window.location = '/'
                return
            } else if (user.email_verified === false || user.password_expired) {
                useAccountAuthStore().clearPending()
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
                useAccountAuthStore().clearPending()
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
                useAccountAuthStore().clearPending()
                if (redirectUrlAfterLogin) {
                    // If this is a user-driven login, take them to the profile page
                    router.push(redirectUrlAfterLogin)
                    // Clear the redirectUrl on nextTick
                    nextTick(() => { useAccountAuthStore().setRedirectUrl(null) })
                }
            } catch (teamLoadErr) {
                useAccountAuthStore().clearPending()
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
            useAccountAuthStore().clearPending()
            // do we have a user session to clear?
            if (useAccountAuthStore().user) {
                try {
                    window.posthog?.reset()
                } catch (err) {
                    console.error('posthog error resetting user')
                }
            }

            if (router.currentRoute.value.meta.requiresLogin !== false) {
                if (router.currentRoute.value.path !== '/') {
                    // Only remember the url if it isn't the default / path
                    useAccountAuthStore().setRedirectUrl(router.currentRoute.value.fullPath)
                }
                router.push({ name: 'Home' })
            }
        }
    },
    async login ({ dispatch }, credentials) {
        try {
            useAccountAuthStore().setLoginInflight()
            if (credentials.username) {
                await userApi.login(credentials.username, credentials.password)
            } else if (credentials.token) {
                await userApi.verifyMFAToken(credentials.token)
            }
            useAccountAuthStore().setPending(true)
            dispatch('checkState', useAccountAuthStore().redirectUrlAfterLogin)
        } catch (err) {
            if (err.response?.status >= 401) {
                useAccountAuthStore().loginFailed(err.response.data)
            } else {
                console.error(err)
            }
        }
    },
    async logout ({ dispatch }) {
        return userApi.logout()
            .then(() => {
                // Reset Vuex state (existing behaviour)
                dispatch('$resetState', null, { root: true })

                // Reset migrated Pinia stores — uncomment each line as its store is migrated
                const pinia = getActivePinia()
                if (pinia) {
                    useAccountAuthStore().$reset()
                    useAccountTeamStore().$reset()
                    useUxDialogStore().$reset()
                    useUxToursStore().$reset()
                    useUxNavigationStore().$reset()
                    useUxDrawersStore().$reset()
                    useUxStore().$reset()
                    useContextStore().$reset()
                    useProductTablesStore().$reset()
                    useProductBrokersStore().$reset()
                    useProductAssistantStore().$reset()
                    useProductExpertSupportAgentStore().$reset()
                    useProductExpertInsightsAgentStore().$reset()
                    useProductExpertStore().$reset()
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
    async refreshSettings (state) {
        const settings = await settingsApi.getSettings()
        state.commit('setSettings', settings)
    },
    checkIfAuthenticated () {
        return useAccountAuthStore().checkIfAuthenticated()
    }
}

export default {
    namespaced: true,
    state,
    initialState: initialState(),
    getters,
    actions,
    mutations,
    meta
}
