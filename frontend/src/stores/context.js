import { defineStore } from 'pinia'

import teamApi from '../api/team.js'
import product from '../services/product.js'

import { useAccountBridge } from './_account_bridge.js'
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
            const account = useAccountBridge()
            const assistant = useProductAssistantStore()

            if (!state.route) {
                return {
                    assistantVersion: assistant.version,
                    assistantFeatures: assistant.assistantFeatures,
                    palette: null,
                    debugLog: null,
                    userId: account.userId,
                    teamId: state.team?.id || null,
                    teamSlug: state.team?.slug || null,
                    instanceId: null,
                    deviceId: null,
                    applicationId: null,
                    isTrialAccount: this.isTrialAccount,
                    nodeRedVersion: assistant.nodeRedVersion,
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

            if (scope === 'immersive' && assistant.selectedNodes.length > 0) {
                // Lazy require to avoid circular dependency:
                // context.js → product-expert.js → product-assistant.js → context.js
                const { useProductExpertStore } = require('./product-expert.js')
                if (useProductExpertStore().isSupportAgent) {
                    selectedNodes = assistant.selectedNodes
                }
            }

            let palette = null
            if (assistant.selectedContext?.some(e => e.value === 'palette')) {
                palette = assistant.paletteContribOnly
            }

            return {
                assistantVersion: assistant.version,
                assistantFeatures: assistant.assistantFeatures,
                palette,
                debugLog: assistant.debugLog,
                userId: account.userId,
                teamId: state.team?.id || null,
                teamSlug: state.team?.slug || null,
                instanceId: instanceId ?? null,
                deviceId: deviceId ?? null,
                applicationId: applicationId ?? null,
                isTrialAccount: this.isTrialAccount,
                pageName: state.route.name,
                nodeRedVersion: assistant.nodeRedVersion,
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
