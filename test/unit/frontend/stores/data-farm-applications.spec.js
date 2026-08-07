import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import applicationApi from '@/api/application.js'
import teamApi from '@/api/team.js'
import { useDataFarmApplicationsStore } from '@/stores/data-farm-applications'
import { useDataFarmTeamsStore } from '@/stores/data-farm-teams'

describe('data-farm-applications store', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        useDataFarmTeamsStore().setActiveTeam({ id: 'team-1' })
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('starts empty and unloaded', () => {
        const store = useDataFarmApplicationsStore()
        expect(store.applicationsById).toEqual({})
        expect(store.teamApplicationIds).toEqual([])
        expect(store.teamApplications).toEqual([])
        expect(store.applicationsListHydrated).toBe(false)
        expect(store.applicationHydrated).toBe(false)
    })

    describe('ensureTeamApplicationsLoaded', () => {
        it('fetches the team applications and normalises them', async () => {
            const spy = vi.spyOn(teamApi, 'getTeamApplications').mockResolvedValue({
                applications: [{ id: 'a1', name: 'One' }, { id: 'a2', name: 'Two' }]
            })
            const store = useDataFarmApplicationsStore()

            await store.ensureTeamApplicationsLoaded()

            expect(spy).toHaveBeenCalledWith('team-1', expect.objectContaining({ includeApplicationSummary: true }))
            expect(store.teamApplicationIds).toEqual(['a1', 'a2'])
            expect(store.teamApplications.map(a => a.name)).toEqual(['One', 'Two'])
            expect(store.applicationsListHydrated).toBe(true)
        })

        it('does not refetch when the team is already loaded', async () => {
            const spy = vi.spyOn(teamApi, 'getTeamApplications').mockResolvedValue({ applications: [{ id: 'a1' }] })
            const store = useDataFarmApplicationsStore()

            await store.ensureTeamApplicationsLoaded()
            await store.ensureTeamApplicationsLoaded()

            expect(spy).toHaveBeenCalledTimes(1)
        })

        it('refetches the same team when forced', async () => {
            const spy = vi.spyOn(teamApi, 'getTeamApplications').mockResolvedValue({ applications: [{ id: 'a1' }] })
            const store = useDataFarmApplicationsStore()

            await store.ensureTeamApplicationsLoaded()
            await store.ensureTeamApplicationsLoaded({ force: true })

            expect(spy).toHaveBeenCalledTimes(2)
        })

        it('replaces the list after reset when the team changes', async () => {
            vi.spyOn(teamApi, 'getTeamApplications')
                .mockResolvedValueOnce({ applications: [{ id: 'a1' }] })
                .mockResolvedValueOnce({ applications: [{ id: 'b1' }] })
            const store = useDataFarmApplicationsStore()

            await store.ensureTeamApplicationsLoaded()
            store.reset()
            useDataFarmTeamsStore().setActiveTeam({ id: 'team-2' })
            await store.ensureTeamApplicationsLoaded()

            expect(store.teamApplicationIds).toEqual(['b1'])
        })

        it('does not mark the list hydrated when the fetch rejects', async () => {
            vi.spyOn(teamApi, 'getTeamApplications').mockRejectedValue(new Error('boom'))
            const store = useDataFarmApplicationsStore()

            await expect(store.ensureTeamApplicationsLoaded()).rejects.toThrow('boom')
            expect(store.applicationsListHydrated).toBe(false)
        })

        it('reads the current team from the context store', async () => {
            const spy = vi.spyOn(teamApi, 'getTeamApplications').mockResolvedValue({ applications: [] })
            useDataFarmTeamsStore().setActiveTeam({ id: 'team-9' })
            const store = useDataFarmApplicationsStore()

            await store.ensureTeamApplicationsLoaded()

            expect(spy).toHaveBeenCalledWith('team-9', expect.any(Object))
        })

        it('does nothing when no team is set in context', async () => {
            const spy = vi.spyOn(teamApi, 'getTeamApplications').mockResolvedValue({ applications: [] })
            useDataFarmTeamsStore().setActiveTeam(null)
            const store = useDataFarmApplicationsStore()

            await store.ensureTeamApplicationsLoaded()

            expect(spy).not.toHaveBeenCalled()
            expect(store.applicationsListHydrated).toBe(false)
        })
    })

    describe('createApplication', () => {
        it('adds the created application to the list (same-session)', async () => {
            vi.spyOn(teamApi, 'getTeamApplications').mockResolvedValue({ applications: [{ id: 'a1', name: 'One' }] })
            vi.spyOn(applicationApi, 'createApplication').mockResolvedValue({ id: 'a2', name: 'New' })
            const store = useDataFarmApplicationsStore()
            await store.ensureTeamApplicationsLoaded()

            const created = await store.createApplication({ name: 'New', teamId: 'team-1' })

            expect(applicationApi.createApplication).toHaveBeenCalledWith({ name: 'New', teamId: 'team-1' })
            expect(created).toEqual({ id: 'a2', name: 'New' })
            expect(store.teamApplicationIds).toEqual(['a1', 'a2'])
            expect(store.teamApplications.map(a => a.name)).toEqual(['One', 'New'])
        })
    })

    describe('updateApplication', () => {
        it('merges changes without dropping existing summary fields', async () => {
            vi.spyOn(teamApi, 'getTeamApplications').mockResolvedValue({
                applications: [{ id: 'a1', name: 'Old', instanceCount: 3 }]
            })
            vi.spyOn(applicationApi, 'updateApplication').mockResolvedValue({ id: 'a1', name: 'Renamed', description: 'd' })
            const store = useDataFarmApplicationsStore()
            await store.ensureTeamApplicationsLoaded()

            await store.updateApplication('a1', { name: 'Renamed', description: 'd' })

            expect(applicationApi.updateApplication).toHaveBeenCalledWith('a1', 'Renamed', 'd')
            expect(store.applicationsById.a1).toEqual({ id: 'a1', name: 'Renamed', description: 'd', instanceCount: 3 })
            expect(store.teamApplicationIds).toEqual(['a1'])
        })
    })

    describe('deleteApplication', () => {
        it('removes the application from the list (same-session)', async () => {
            vi.spyOn(teamApi, 'getTeamApplications').mockResolvedValue({
                applications: [{ id: 'a1' }, { id: 'a2' }]
            })
            vi.spyOn(applicationApi, 'deleteApplication').mockResolvedValue(undefined)
            const store = useDataFarmApplicationsStore()
            await store.ensureTeamApplicationsLoaded()

            await store.deleteApplication('a1', 'team-1')

            expect(applicationApi.deleteApplication).toHaveBeenCalledWith('a1', 'team-1')
            expect(store.teamApplicationIds).toEqual(['a2'])
            expect(store.applicationsById.a1).toBeUndefined()
        })
    })

    describe('upsertApplication / removeApplication', () => {
        it('ignores an upsert without an id', () => {
            const store = useDataFarmApplicationsStore()
            store.upsertApplication({ name: 'no id' })
            expect(store.teamApplicationIds).toEqual([])
        })

        it('upsert updates an existing entry in place without duplicating the id', () => {
            const store = useDataFarmApplicationsStore()
            store.upsertApplication({ id: 'a1', name: 'One' })
            store.upsertApplication({ id: 'a1', name: 'One prime' })
            expect(store.teamApplicationIds).toEqual(['a1'])
            expect(store.applicationsById.a1.name).toBe('One prime')
        })
    })

    describe('applyRealtimeEvent', () => {
        it('upserts on a created event (cross-session add)', async () => {
            vi.spyOn(teamApi, 'getTeamApplications').mockResolvedValue({ applications: [{ id: 'a1', name: 'One' }] })
            const store = useDataFarmApplicationsStore()
            await store.ensureTeamApplicationsLoaded()

            store.applyRealtimeEvent({ id: 'a2', action: 'created', data: { id: 'a2', name: 'Two' } })

            expect(store.teamApplicationIds).toEqual(['a1', 'a2'])
            expect(store.teamApplications.map(a => a.name)).toEqual(['One', 'Two'])
        })

        it('merges on an updated event without dropping summary fields', async () => {
            vi.spyOn(teamApi, 'getTeamApplications').mockResolvedValue({
                applications: [{ id: 'a1', name: 'Old', instanceCount: 3 }]
            })
            const store = useDataFarmApplicationsStore()
            await store.ensureTeamApplicationsLoaded()

            store.applyRealtimeEvent({ id: 'a1', action: 'updated', data: { id: 'a1', name: 'Renamed' } })

            expect(store.applicationsById.a1).toEqual({ id: 'a1', name: 'Renamed', instanceCount: 3 })
        })

        it('removes on a deleted event (cross-session remove)', async () => {
            vi.spyOn(teamApi, 'getTeamApplications').mockResolvedValue({ applications: [{ id: 'a1' }, { id: 'a2' }] })
            const store = useDataFarmApplicationsStore()
            await store.ensureTeamApplicationsLoaded()

            store.applyRealtimeEvent({ id: 'a1', action: 'deleted' })

            expect(store.teamApplicationIds).toEqual(['a2'])
            expect(store.applicationsById.a1).toBeUndefined()
        })

        it('ignores an event missing id or action', () => {
            const store = useDataFarmApplicationsStore()
            store.applyRealtimeEvent({ action: 'created', data: { id: 'a1' } })
            store.applyRealtimeEvent({ id: 'a1' })
            expect(store.teamApplicationIds).toEqual([])
        })

        it('ignores a created/updated event with no data payload', () => {
            const store = useDataFarmApplicationsStore()
            store.applyRealtimeEvent({ id: 'a1', action: 'created' })
            expect(store.teamApplicationIds).toEqual([])
        })
    })

    describe('loadActiveApplication', () => {
        it('fetches the application, sets it active, and returns it', async () => {
            vi.spyOn(applicationApi, 'getApplication').mockResolvedValue({ id: 'a1', name: 'Detail' })
            const store = useDataFarmApplicationsStore()

            const application = await store.loadActiveApplication('a1')

            expect(applicationApi.getApplication).toHaveBeenCalledWith('a1')
            expect(application).toEqual({ id: 'a1', name: 'Detail' })
            expect(store.activeApplication).toEqual({ id: 'a1', name: 'Detail' })
            expect(store.applicationHydrated).toBe(true)
            // the active app is cached but not a member of the team list
            expect(store.teamApplicationIds).toEqual([])
        })

        it('does not mark the application hydrated when the fetch rejects', async () => {
            vi.spyOn(applicationApi, 'getApplication').mockRejectedValue(new Error('boom'))
            const store = useDataFarmApplicationsStore()

            await expect(store.loadActiveApplication('a1')).rejects.toThrow('boom')
            expect(store.applicationHydrated).toBe(false)
        })
    })

    describe('setActiveApplication / activeApplication', () => {
        it('returns null when no active application is set', () => {
            const store = useDataFarmApplicationsStore()
            expect(store.activeApplication).toBe(null)
        })

        it('sets the active application and caches it WITHOUT adding it to the team list', () => {
            const store = useDataFarmApplicationsStore()

            store.setActiveApplication({ id: 'a1', name: 'Detail' })

            expect(store.activeApplication).toEqual({ id: 'a1', name: 'Detail' })
            // the active app is not a list member — viewing it must not pollute teamApplications
            expect(store.teamApplicationIds).toEqual([])
            expect(store.teamApplications).toEqual([])
        })

        it('merges into an existing list entry without duplicating its id', async () => {
            vi.spyOn(teamApi, 'getTeamApplications').mockResolvedValue({
                applications: [{ id: 'a1', name: 'One', instanceCount: 2 }]
            })
            const store = useDataFarmApplicationsStore()
            await store.ensureTeamApplicationsLoaded()

            store.setActiveApplication({ id: 'a1', name: 'One', description: 'd' })

            expect(store.activeApplication).toEqual({ id: 'a1', name: 'One', description: 'd', instanceCount: 2 })
            expect(store.teamApplicationIds).toEqual(['a1'])
        })

        it('clears the active application and its hydration flag on null', () => {
            const store = useDataFarmApplicationsStore()
            store.setActiveApplication({ id: 'a1', name: 'Detail' })
            store.applicationHydrated = true
            store.setActiveApplication(null)
            expect(store.activeApplication).toBe(null)
            expect(store.applicationHydrated).toBe(false)
        })

        it('clearActiveApplication resets the active application and its hydration flag', () => {
            const store = useDataFarmApplicationsStore()
            store.setActiveApplication({ id: 'a1', name: 'Detail' })
            store.applicationHydrated = true
            store.clearActiveApplication()
            expect(store.activeApplication).toBe(null)
            expect(store.applicationHydrated).toBe(false)
        })
    })

    describe('reset', () => {
        it('resets all state (team-switch / logout teardown)', async () => {
            vi.spyOn(teamApi, 'getTeamApplications').mockResolvedValue({ applications: [{ id: 'a1' }] })
            const store = useDataFarmApplicationsStore()
            await store.ensureTeamApplicationsLoaded()
            store.setActiveApplication({ id: 'a1' })

            store.reset()

            expect(store.applicationsById).toEqual({})
            expect(store.teamApplicationIds).toEqual([])
            expect(store.activeApplication).toBe(null)
            expect(store.applicationsListHydrated).toBe(false)
            expect(store.applicationHydrated).toBe(false)
        })
    })
})
