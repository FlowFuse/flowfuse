import { defineStore } from 'pinia'

import flowBlueprintsApi from '@/api/flowBlueprints.js'
import userApi from '@/api/user.js'
import getAppOrchestrator from '@/services/app.orchestrator'
import product from '@/services/product.js'
import { useContextStore } from '@/stores/context.js'
import { useDataFarmApplicationsStore } from '@/stores/data-farm-applications'
import { useDataFarmTeamsStore } from '@/stores/data-farm-teams'
import { useProductTablesStore } from '@/stores/product-tables.js'

function ensureTeamChannelConnected (team) {
    if (!team?.id) return
    const subscribers = getAppOrchestrator().$subscribers
    Object.values(subscribers).forEach(subscriber => subscriber?.connect(team).catch(() => {}))
}

function disconnectTeamSubscribers () {
    const subscribers = getAppOrchestrator().$subscribers
    Object.values(subscribers).forEach(subscriber => subscriber?.disconnect().catch(() => {}))
}

export const useAccountStore = defineStore('account', {
    state: () => ({
        teamBlueprints: {},
        pendingTeamChange: false,
        notifications: [],
        invitations: []
    }),
    getters: {
        blueprints (state) {
            const teamId = useContextStore().team?.id
            return state.teamBlueprints[teamId] || []
        },
        defaultBlueprint () { return this.blueprints?.find(blueprint => blueprint.default) },
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
        hasNotifications () { return this.notificationsCount > 0 },
        teamInvitations: state => state.invitations,
        teamInvitationsCount: state => state.invitations?.length || 0
    },
    actions: {
        async setTeam (team) {
            const context = useContextStore()
            const teams = useDataFarmTeamsStore()
            const currentTeam = context.team
            this.pendingTeamChange = true
            if (typeof team === 'string') {
                if (!currentTeam || currentTeam.slug !== team) {
                    team = await teams.fetchTeam({ slug: team })
                } else {
                    ensureTeamChannelConnected(currentTeam)
                    this.pendingTeamChange = false
                    return
                }
            } else {
                if (!currentTeam && !team) {
                    this.pendingTeamChange = false
                    return
                }
                if (currentTeam?.id === team?.id) {
                    // Same team — update team data and refresh membership
                    // without clearing other stores
                    if (team?.id) {
                        context.setTeam(team)
                        await context.refreshTeamMembership()
                    }
                    ensureTeamChannelConnected(team || currentTeam)
                    this.pendingTeamChange = false
                    return
                }
            }
            product.setTeam(team)
            context.setTeam(team)
            this.clearOtherStores()
            if (team?.id) {
                await context.refreshTeamMembership()
                ensureTeamChannelConnected(team)
            } else {
                context.setTeamMembership(null)
                disconnectTeamSubscribers()
            }
            this.pendingTeamChange = false
        },
        async getTeamBlueprints (teamId) {
            const response = await flowBlueprintsApi.getFlowBlueprintsForTeam(teamId)
            const blueprints = response.blueprints

            this.teamBlueprints[teamId] = blueprints
        },
        async getNotifications () {
            await userApi.getNotifications()
                .then((notifications) => {
                    this.notifications = notifications.notifications || []
                })
                .catch(_ => {})
        },
        setNotifications (notifications) {
            this.notifications = notifications
        },
        async getInvitations () {
            await userApi.getTeamInvitations()
                .then((invitations) => {
                    this.invitations = invitations.invitations
                })
                .catch(_ => {})
        },
        clearOtherStores () {
            useProductTablesStore().clearState()
            useDataFarmApplicationsStore().reset()
        }
    }
})
