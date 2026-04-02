import { defineStore } from 'pinia'

import flowBlueprintsApi from '@/api/flowBlueprints.js'
import teamApi from '@/api/team.js'
import userApi from '@/api/user.js'
import product from '@/services/product.js'
import { useAccountAuthStore } from '@/stores/account-auth.js'
import { useContextStore } from '@/stores/context.js'
import { useProductTablesStore } from '@/stores/product-tables.js'

export const useAccountTeamStore = defineStore('account-team', {
    state: () => ({
        teams: [],
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
        defaultUserTeam: (state) => {
            const defaultTeamId = useAccountAuthStore().user?.defaultTeam || state.teams[0]?.id
            return state.teams.find(team => team.id === defaultTeamId)
        },
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
        teamInvitationsCount: state => state.invitations?.length || 0,
        hasAvailableTeams: state => state.teams.length > 0
    },
    actions: {
        setTeams (teams) {
            this.teams = teams
        },
        async setTeam (team) {
            const context = useContextStore()
            const currentTeam = context.team
            this.pendingTeamChange = true
            let teamMembership
            if (typeof team === 'string') {
                if (!currentTeam || currentTeam.slug !== team) {
                    team = await teamApi.getTeam({ slug: team })
                } else {
                    this.pendingTeamChange = false
                    return
                }
            } else {
                if (!currentTeam && !team) {
                    this.pendingTeamChange = false
                    return
                }
                if (currentTeam?.id === team?.id) {
                    // Same team — skip full reload but always refresh membership
                    if (team?.id) {
                        context.setTeamMembership(await teamApi.getTeamUserMembership(team.id))
                    }
                    this.pendingTeamChange = false
                    return
                }
            }
            if (team?.id) {
                teamMembership = await teamApi.getTeamUserMembership(team.id)
            }
            product.setTeam(team)
            context.setTeam(team)
            this.clearOtherStores()
            context.setTeamMembership(teamMembership)
            this.pendingTeamChange = false
        },
        async refreshTeams () {
            const teams = await teamApi.getTeams()
            this.teams = teams.teams
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
        }
    }
})
