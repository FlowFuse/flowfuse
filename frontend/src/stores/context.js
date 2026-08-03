import { defineStore } from 'pinia'

import teamApi from '../api/team.js'
import { hasAMinimumTeamRoleOf } from '../composables/Permissions.js'
import product from '../services/product.js'
import { Roles } from '../utils/roles.js'

import { useAccountAuthStore } from './account-auth.js'
import { useAccountSettingsStore } from './account-settings.js'
import { useDataFarmApplicationsStore } from './data-farm-applications'
import { useProductAssistantStore } from './product-assistant.js'
import { useProductExpertStore } from './product-expert.js'

export const useContextStore = defineStore('context', {
    state: () => ({
        route: null,
        instance: null,
        device: null,
        team: null,
        teamMembership: null
    }),
    getters: {
        application () {
            return useDataFarmApplicationsStore().activeApplication
        },
        isImmersive (state) {
            return state.route?.meta?.layout === 'immersive'
        },
        isFreeTeamType (state) {
            return !!(state.team?.type?.properties?.billing?.disabled)
        },
        isTrialAccount (state) {
            return !!state.team?.billing?.trial
        },
        isTrialAccountExpired (state) {
            return this.isTrialAccount && state.team?.billing?.trialEnded
        },
        editorEntityType (state) {
            const name = state.route?.name
            if (name?.startsWith('instance-editor')) return 'instance'
            if (name?.startsWith('device-editor')) return 'device'
            return null
        },
        isImmersiveEditor () {
            return this.editorEntityType !== null
        },
        expert (state) {
            const authStore = useAccountAuthStore()
            const assistantStore = useProductAssistantStore()

            if (!state.route) {
                return {
                    assistantVersion: assistantStore.version,
                    assistantFeatures: assistantStore.assistantFeatures,
                    palette: null,
                    debugLog: null,
                    userId: authStore.user?.id || null,
                    teamId: state.team?.id || null,
                    teamSlug: state.team?.slug || null,
                    instanceId: null,
                    deviceId: null,
                    applicationId: null,
                    deviceOwnerType: null,
                    isTrialAccount: this.isTrialAccount,
                    nodeRedVersion: assistantStore.nodeRedVersion,
                    pageName: null,
                    rawRoute: {},
                    selectedNodes: null,
                    scope: this.isImmersive ? 'immersive' : 'ff-app',
                    questionCadence: useProductExpertStore().questionCadence,
                    planMode: useProductExpertStore().planMode
                }
            }

            const { matched, redirectedFrom, ...rawRoute } = state.route ?? {}
            let selectedNodes = null

            if (this.isImmersive && assistantStore.selectedNodes.length > 0) {
                if (useProductExpertStore().isSupportAgent) {
                    selectedNodes = assistantStore.selectedNodes
                }
            }

            let palette = null
            if (assistantStore.selectedContext?.some(e => e.value === 'palette')) {
                palette = assistantStore.paletteContribOnly
            }

            return {
                assistantVersion: assistantStore.version,
                assistantFeatures: assistantStore.assistantFeatures,
                palette,
                debugLog: assistantStore.debugLog,
                userId: authStore.user?.id || null,
                teamId: state.team?.id || null,
                teamSlug: state.team?.slug || null,
                instanceId: state.instance ? state.instance.id : null,
                deviceId: state.device ? state.device.id : null,
                applicationId: this.application ? this.application.id : null,
                deviceOwnerType: state.device?.ownerType ?? null,
                isTrialAccount: this.isTrialAccount,
                pageName: state.route.name,
                nodeRedVersion: assistantStore.nodeRedVersion,
                rawRoute,
                selectedNodes,
                scope: this.isImmersive ? 'immersive' : 'ff-app',
                supportsPlatformAutomation: useAccountSettingsStore().featuresCheck?.isExpertPlatformAutomationFeatureEnabled ?? false,
                supportsPlatformUIAutomation: useAccountSettingsStore().featuresCheck?.isExpertPlatformAutomationFeatureEnabled ?? false,
                questionCadence: useProductExpertStore().questionCadence,
                planMode: useProductExpertStore().planMode,
                // Capability flags: signal that this version can render the question,
                // plan, and approval cards. Older instances omit them and the agent drops
                // the matching tool / runs in backward-compatible mode.
                supportsQuestions: true,
                supportsPlanMode: true,
                supportsHITL: true,
                // Human-in-the-loop tool permissions (#421). The agent gates each
                // flow-building tool call against this map; canUseWriteTools drives
                // role inheritance (fail-closed) for write/delete tools.
                toolPermissions: assistantStore.resolvedToolPermissions,
                canUseWriteTools: hasAMinimumTeamRoleOf(Roles.Member, state.teamMembership)
            }
        }
    },
    actions: {
        updateRoute (route) { this.route = route },
        setInstance (instance) {
            this.instance = instance ?? null
            this.setApplication(instance?.application ?? null)
        },
        setDevice (device) {
            this.device = device ?? null
            this.instance = device?.instance ?? null
            this.setApplication(device?.application ?? null)
        },
        setApplication (application) {
            useDataFarmApplicationsStore().setActiveApplication(application)
        },
        clearInstance () { this.setInstance(null) },
        setTeam (team) {
            this.team = team
        },
        setTeamMembership (teamMembership) {
            this.teamMembership = teamMembership
        },
        async refreshTeam () {
            const currentTeam = this.team
            if (currentTeam) {
                const currentSlug = currentTeam.slug
                const team = await teamApi.getTeam(currentTeam.id)
                const teamMembership = await teamApi.getTeamUserMembership(team.id)
                product.setTeam(team)
                this.team = team
                this.teamMembership = teamMembership
                if (currentSlug !== team.slug) {
                    const router = require('@/routes.js').default
                    router.replace({ name: router.currentRoute.value.name, params: { team_slug: team.slug } })
                }
            }
        },
        async refreshTeamMembership () {
            const teamMembership = await teamApi.getTeamUserMembership(this.team.id)
            this.teamMembership = teamMembership
        },
        async onTeamChannelMembership (payload) {
            if (payload?.reason === 'removed') {
                const path = window.location.pathname
                if (typeof path === 'string' && path.startsWith('/team/')) {
                    // Hard reload, not a router push: Home.vue would bounce back
                    // to the still-cached removed team; a reload re-bootstraps clean.
                    try { window.location.assign('/') } catch {}
                }
                return
            }
            await this.refreshTeamMembership()
        }
    },
    persist: [
        { pick: ['team', 'teamMembership'], storage: sessionStorage }
    ]
})
