import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import teamApi from '@/api/team.js'
import { useAccountAuthStore } from '@/stores/account-auth.js'
import type { UserTeamList } from '@/types'

type TeamListEntry = UserTeamList[number]

export const useDataFarmTeamsStore = defineStore('data-farm-teams', () => {
    const teamList = ref<TeamListEntry[]>([])

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

    function reset (): void {
        teamList.value = []
    }

    return {
        teamList,
        hasAvailableTeams,
        defaultUserTeam,
        fetchTeamList,
        reset
    }
})
