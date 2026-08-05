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

    describe('active team', () => {
        it('sets and clears the active team + membership', () => {
            const store = useDataFarmTeamsStore()
            store.setActiveTeam({ id: 't1', slug: 'a' })
            store.setActiveTeamMembership({ role: 50 })
            expect(store.activeTeam).toEqual({ id: 't1', slug: 'a' })
            expect(store.activeTeamMembership).toEqual({ role: 50 })

            store.setActiveTeam(null)
            expect(store.activeTeam).toBe(null)
        })

        it('fetchTeam resolves a team without changing active state', async () => {
            vi.spyOn(teamApi, 'getTeam').mockResolvedValue({ id: 't5', slug: 'q' })
            const store = useDataFarmTeamsStore()

            const team = await store.fetchTeam({ slug: 'q' })

            expect(teamApi.getTeam).toHaveBeenCalledWith({ slug: 'q' })
            expect(team).toEqual({ id: 't5', slug: 'q' })
            expect(store.activeTeam).toBe(null)
        })

        it('refreshActiveTeam refetches the team and membership', async () => {
            vi.spyOn(teamApi, 'getTeam').mockResolvedValue({ id: 't1', slug: 'a', name: 'Fresh' })
            vi.spyOn(teamApi, 'getTeamUserMembership').mockResolvedValue({ role: 30 })
            const store = useDataFarmTeamsStore()
            store.setActiveTeam({ id: 't1', slug: 'a' })

            const team = await store.refreshActiveTeam()

            expect(teamApi.getTeam).toHaveBeenCalledWith('t1')
            expect(store.activeTeam).toEqual({ id: 't1', slug: 'a', name: 'Fresh' })
            expect(store.activeTeamMembership).toEqual({ role: 30 })
            expect(team).toEqual({ id: 't1', slug: 'a', name: 'Fresh' })
        })

        it('refreshActiveTeam does nothing when no active team is set', async () => {
            const spy = vi.spyOn(teamApi, 'getTeam')
            const store = useDataFarmTeamsStore()

            expect(await store.refreshActiveTeam()).toBe(null)
            expect(spy).not.toHaveBeenCalled()
        })

        it('refreshActiveMembership refetches only the membership', async () => {
            vi.spyOn(teamApi, 'getTeamUserMembership').mockResolvedValue({ role: 40 })
            const store = useDataFarmTeamsStore()
            store.setActiveTeam({ id: 't1' })

            await store.refreshActiveMembership()

            expect(teamApi.getTeamUserMembership).toHaveBeenCalledWith('t1')
            expect(store.activeTeamMembership).toEqual({ role: 40 })
        })
    })

    describe('reset', () => {
        it('clears the list and the active team', async () => {
            vi.spyOn(teamApi, 'getTeams').mockResolvedValue({ teams: [{ id: 't1' }] })
            const store = useDataFarmTeamsStore()
            await store.fetchTeamList()
            store.setActiveTeam({ id: 't1' })
            store.setActiveTeamMembership({ role: 50 })

            store.reset()

            expect(store.teamList).toEqual([])
            expect(store.hasAvailableTeams).toBe(false)
            expect(store.activeTeam).toBe(null)
            expect(store.activeTeamMembership).toBe(null)
        })
    })
})
