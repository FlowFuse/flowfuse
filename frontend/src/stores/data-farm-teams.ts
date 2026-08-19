import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import teamApi from '@/api/team.js'
import { useAccountAuthStore } from '@/stores/account-auth.js'
import type { Team, TeamSummary, UserTeamList } from '@/types'

type TeamListEntry = UserTeamList[number]
type ActiveTeam = Team | TeamSummary

export const useDataFarmTeamsStore = defineStore('data-farm-teams', () => {
    const teamList = ref<TeamListEntry[]>([])
    const activeTeam = ref<ActiveTeam | null>(null)
    const activeTeamMembership = ref<Record<string, unknown> | null>(null)

    const hasAvailableTeams = computed(() => teamList.value.length > 0)
    const defaultUserTeam = computed(() => {
        const defaultTeamId = useAccountAuthStore().user?.defaultTeam || teamList.value[0]?.id
        return teamList.value.find(team => team.id === defaultTeamId) ?? null
    })

    async function fetchTeamList (): Promise<TeamListEntry[]> {
        const response = await teamApi.getTeams()
        teamList.value = response.teams ?? []
        return teamList.value
    }

    function setActiveTeam (team: ActiveTeam | null): void {
        activeTeam.value = team ?? null
    }

    function setActiveTeamMembership (membership: Record<string, unknown> | null): void {
        activeTeamMembership.value = membership ?? null
    }

    async function fetchTeam (idOrSlug: string | { slug: string }): Promise<ActiveTeam> {
        return teamApi.getTeam(idOrSlug)
    }

    async function refreshActiveTeam (): Promise<ActiveTeam | null> {
        if (!activeTeam.value) return null
        const team = await fetchTeam(activeTeam.value.id)
        activeTeam.value = team
        activeTeamMembership.value = await teamApi.getTeamUserMembership(team.id)
        return team
    }

    async function refreshActiveMembership (): Promise<void> {
        if (!activeTeam.value) return
        activeTeamMembership.value = await teamApi.getTeamUserMembership(activeTeam.value.id)
    }

    function reset (): void {
        teamList.value = []
        activeTeam.value = null
        activeTeamMembership.value = null
    }

    return {
        teamList,
        activeTeam,
        activeTeamMembership,
        hasAvailableTeams,
        defaultUserTeam,
        fetchTeamList,
        fetchTeam,
        setActiveTeam,
        setActiveTeamMembership,
        refreshActiveTeam,
        refreshActiveMembership,
        reset
    }
}, {
    persist: {
        pick: ['activeTeam', 'activeTeamMembership'],
        storage: sessionStorage
    }
})
