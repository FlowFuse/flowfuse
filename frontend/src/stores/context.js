import { defineStore } from 'pinia'

import teamApi from '../api/team.js'
import product from '../services/product.js'

import { useAccountAuthStore } from './account-auth.js'
import { useProductAssistantStore } from './product-assistant.js'

export const useContextStore = defineStore('context', {
    state: () => ({
        route: null,
        instance: null,
        device: null,
        team: null,
        teamMembership: null
    }),
    getters: {
        isFreeTeamType (state) {
            return !!(state.team?.type?.properties?.billing?.disabled)
        },
        isTrialAccount (state) {
            return !!state.team?.billing?.trial
        },
        isTrialAccountExpired (state) {
            return this.isTrialAccount && state.team?.billing?.trialEnded
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
                    isTrialAccount: this.isTrialAccount,
                    nodeRedVersion: assistantStore.nodeRedVersion,
                    pageName: null,
                    rawRoute: {},
                    selectedNodes: null,
                    scope: 'ff-app'
                }
            }

            const instanceId = state.route.fullPath.includes('/instance/')
                ? state.route.params?.id
                : null
            const applicationId = state.route.fullPath.includes('/applications/')
                ? state.route.params?.id
                : null
            const deviceId = state.route.fullPath.includes('/device/')
                ? state.route.params?.id
                : null
            const scope =
                state.route.fullPath.includes('/instance/') &&
                state.route.fullPath.includes('editor')
                    ? 'immersive'
                    : 'ff-app'

            const { matched, redirectedFrom, ...rawRoute } = state.route ?? {}
            let selectedNodes = null

            if (scope === 'immersive' && assistantStore.selectedNodes.length > 0) {
                // Lazy require to avoid circular dependency:
                // context.js → product-expert.js → product-assistantStore.js → context.js
                const { useProductExpertStore } = require('./product-expert.js')
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
                instanceId: instanceId ?? null,
                deviceId: deviceId ?? null,
                applicationId: applicationId ?? null,
                isTrialAccount: this.isTrialAccount,
                pageName: state.route.name,
                nodeRedVersion: assistantStore.nodeRedVersion,
                rawRoute,
                selectedNodes,
                scope
            }
        }
    },
    actions: {
        updateRoute (route) { this.route = route },
        setInstance (instance) { this.instance = instance },
        setDevice (device) { this.device = device },
        clearInstance () { this.instance = null },
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
        }
    },
    persist: [
        { pick: ['team', 'teamMembership'], storage: sessionStorage }
    ]
})
