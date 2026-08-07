import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import teamApi from '@/api/team.js'
import { useDataFarmTeamsStore } from '@/stores/data-farm-teams'

const authState = vi.hoisted(() => ({ user: null }))

vi.mock('@/stores/account-auth.js', () => ({
    useAccountAuthStore: () => authState
}))

describe('data-farm-teams store', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        authState.user = null
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('starts empty', () => {
        const store = useDataFarmTeamsStore()
        expect(store.teamList).toEqual([])
        expect(store.hasAvailableTeams).toBe(false)
        expect(store.defaultUserTeam).toBe(null)
    })

    describe('fetchTeamList', () => {
        it('fetches and normalises the team list', async () => {
            vi.spyOn(teamApi, 'getTeams').mockResolvedValue({ teams: [{ id: 't1', name: 'One' }, { id: 't2', name: 'Two' }] })
            const store = useDataFarmTeamsStore()

            const result = await store.fetchTeamList()

            expect(store.teamList.map(t => t.id)).toEqual(['t1', 't2'])
            expect(store.teamList.map(t => t.name)).toEqual(['One', 'Two'])
            expect(store.hasAvailableTeams).toBe(true)
            expect(result).toEqual(store.teamList)
        })

        it('replaces the list on refetch', async () => {
            vi.spyOn(teamApi, 'getTeams')
                .mockResolvedValueOnce({ teams: [{ id: 't1' }] })
                .mockResolvedValueOnce({ teams: [{ id: 't2' }] })
            const store = useDataFarmTeamsStore()

            await store.fetchTeamList()
            await store.fetchTeamList()

            expect(store.teamList.map(t => t.id)).toEqual(['t2'])
        })

        it('handles an empty list', async () => {
            vi.spyOn(teamApi, 'getTeams').mockResolvedValue({ teams: [] })
            const store = useDataFarmTeamsStore()

            await store.fetchTeamList()

            expect(store.teamList).toEqual([])
            expect(store.hasAvailableTeams).toBe(false)
        })
    })

    describe('defaultUserTeam', () => {
        it('is the first team when the user has no default', async () => {
            vi.spyOn(teamApi, 'getTeams').mockResolvedValue({ teams: [{ id: 't1' }, { id: 't2' }] })
            const store = useDataFarmTeamsStore()

            await store.fetchTeamList()

            expect(store.defaultUserTeam.id).toBe('t1')
        })

        it('is the user default team when set', async () => {
            authState.user = { defaultTeam: 't2' }
            vi.spyOn(teamApi, 'getTeams').mockResolvedValue({ teams: [{ id: 't1' }, { id: 't2' }] })
            const store = useDataFarmTeamsStore()

            await store.fetchTeamList()

            expect(store.defaultUserTeam.id).toBe('t2')
        })

        it('is null when the default team is not in the list', async () => {
            authState.user = { defaultTeam: 'gone' }
            vi.spyOn(teamApi, 'getTeams').mockResolvedValue({ teams: [{ id: 't1' }] })
            const store = useDataFarmTeamsStore()

            await store.fetchTeamList()

            expect(store.defaultUserTeam).toBe(null)
        })
    })

    describe('reset', () => {
        it('clears the list', async () => {
            vi.spyOn(teamApi, 'getTeams').mockResolvedValue({ teams: [{ id: 't1' }] })
            const store = useDataFarmTeamsStore()
            await store.fetchTeamList()

            store.reset()

            expect(store.teamList).toEqual([])
            expect(store.hasAvailableTeams).toBe(false)
        })
    })
})
