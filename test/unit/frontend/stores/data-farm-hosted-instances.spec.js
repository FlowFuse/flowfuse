import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import instanceApi from '@/api/instances.js'
import teamApi from '@/api/team.js'
import { useDataFarmHostedInstancesStore } from '@/stores/data-farm-hosted-instances'
import { useLiveStatusStore } from '@/stores/live-status'

vi.mock('@/composables/InstanceStates.js', () => ({
    useInstanceStates: () => ({
        isRunningState: state => state === 'running',
        isTransitionState: state => ['starting', 'restarting', 'suspending', 'stopping'].includes(state),
        statesMap: {}
    })
}))

const instance = (id, state = 'stopped', extra = {}) => ({ id, name: id, meta: { state }, status: state, ...extra })

describe('data-farm-hosted-instances store', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('starts empty', () => {
        const store = useDataFarmHostedInstancesStore()
        expect(store.currentPageInstances).toEqual([])
        expect(store.total).toBe(0)
    })

    describe('fetchTeamInstancesPage', () => {
        it('loads a page into byId + currentPageIds and resets transition flags', async () => {
            vi.spyOn(teamApi, 'getInstances').mockResolvedValue({
                projects: [instance('i1'), instance('i2', 'running')],
                meta: { total: 7 }
            })
            const store = useDataFarmHostedInstancesStore()

            await store.fetchTeamInstancesPage('team-1', { page: 1 })

            expect(store.currentPageIds).toEqual(['i1', 'i2'])
            expect(store.total).toBe(7)
            expect(store.instancesById.i1.optimisticStateChange).toBe(false)
            expect(store.instancesById.i1.pendingStateChange).toBe(false)
        })

        it('falls back to count then length for total', async () => {
            vi.spyOn(teamApi, 'getInstances').mockResolvedValueOnce({ projects: [instance('i1')], count: 3 })
            const store = useDataFarmHostedInstancesStore()
            await store.fetchTeamInstancesPage('team-1')
            expect(store.total).toBe(3)

            teamApi.getInstances.mockResolvedValueOnce({ projects: [instance('i1'), instance('i2')] })
            await store.fetchTeamInstancesPage('team-1')
            expect(store.total).toBe(2)
        })

        it('does nothing without a teamId', async () => {
            const spy = vi.spyOn(teamApi, 'getInstances')
            const store = useDataFarmHostedInstancesStore()
            await store.fetchTeamInstancesPage('')
            expect(spy).not.toHaveBeenCalled()
        })
    })

    describe('currentPageInstances', () => {
        it('maps ids in order and derives running/notSuspended', async () => {
            vi.spyOn(teamApi, 'getInstances').mockResolvedValue({
                projects: [instance('i1', 'running'), instance('i2', 'suspended')],
                meta: { total: 2 }
            })
            const store = useDataFarmHostedInstancesStore()
            await store.fetchTeamInstancesPage('team-1')

            const rows = store.currentPageInstances
            expect(rows.map(r => r.id)).toEqual(['i1', 'i2'])
            expect(rows[0].running).toBe(true)
            expect(rows[0].notSuspended).toBe(true)
            expect(rows[1].running).toBe(false)
            expect(rows[1].notSuspended).toBe(false)
        })
    })

    describe('currentPageInstanceRefs', () => {
        it('returns raw entities and keeps stable identity for rows that did not change', async () => {
            vi.spyOn(teamApi, 'getInstances').mockResolvedValue({ projects: [instance('i1'), instance('i2')], meta: { total: 2 } })
            const store = useDataFarmHostedInstancesStore()
            await store.fetchTeamInstancesPage('team-1')

            const i1Before = store.currentPageInstanceRefs.find(i => i.id === 'i1')
            const i2Before = store.currentPageInstanceRefs.find(i => i.id === 'i2')
            expect(i1Before).not.toHaveProperty('running') // raw, not the decorated shape

            store.applyPolledStatus({ id: 'i1', meta: { state: 'running' } })

            expect(store.currentPageInstanceRefs.find(i => i.id === 'i2')).toBe(i2Before) // unchanged row keeps identity
            expect(store.currentPageInstanceRefs.find(i => i.id === 'i1')).not.toBe(i1Before) // changed row is replaced
        })
    })

    describe('removeInstance', () => {
        it('removeInstance drops from byId and currentPageIds', async () => {
            vi.spyOn(teamApi, 'getInstances').mockResolvedValue({ projects: [instance('i1'), instance('i2')], meta: { total: 2 } })
            const store = useDataFarmHostedInstancesStore()
            await store.fetchTeamInstancesPage('team-1')

            store.removeInstance('i1')

            expect(store.instancesById.i1).toBeUndefined()
            expect(store.currentPageIds).toEqual(['i2'])
        })
    })

    describe('applyLiveStatus', () => {
        it('applies live state to current-page instances and clears flags', async () => {
            vi.spyOn(teamApi, 'getInstances').mockResolvedValue({ projects: [instance('i1', 'stopped', { optimisticStateChange: true })], meta: { total: 1 } })
            const store = useDataFarmHostedInstancesStore()
            await store.fetchTeamInstancesPage('team-1')
            useLiveStatusStore().setInstanceStatus('i1', 'running')

            store.applyLiveStatus()

            expect(store.instancesById.i1.status).toBe('running')
            expect(store.instancesById.i1.meta.state).toBe('running')
            expect(store.instancesById.i1.optimisticStateChange).toBe(false)
            expect(store.currentPageInstances[0].running).toBe(true)
        })

        it('skips instances already at the live state', async () => {
            vi.spyOn(teamApi, 'getInstances').mockResolvedValue({ projects: [instance('i1', 'running')], meta: { total: 1 } })
            const store = useDataFarmHostedInstancesStore()
            await store.fetchTeamInstancesPage('team-1')
            const before = store.instancesById.i1
            useLiveStatusStore().setInstanceStatus('i1', 'running')

            store.applyLiveStatus()

            expect(store.instancesById.i1).toBe(before)
        })
    })

    describe('applyPolledStatus', () => {
        it('merges polled data and clears flags for a known instance', () => {
            const store = useDataFarmHostedInstancesStore()
            store.instancesById.i1 = instance('i1', 'stopped', { optimisticStateChange: true })

            // getInstance returns meta.state but not a top-level status
            store.applyPolledStatus({ id: 'i1', meta: { state: 'running' } })

            expect(store.instancesById.i1.meta.state).toBe('running')
            expect(store.instancesById.i1.status).toBe('running')
            expect(store.instancesById.i1.optimisticStateChange).toBe(false)
        })

        it('ignores an unknown instance', () => {
            const store = useDataFarmHostedInstancesStore()
            store.applyPolledStatus({ id: 'nope', status: 'running' })
            expect(store.instancesById.nope).toBeUndefined()
        })
    })

    describe('lifecycle actions', () => {
        it('startInstance sets optimistic then pending-from-server on success', async () => {
            vi.spyOn(instanceApi, 'startInstance').mockResolvedValue({})
            const store = useDataFarmHostedInstancesStore()
            store.instancesById.i1 = instance('i1', 'stopped')

            await store.startInstance('i1')

            expect(instanceApi.startInstance).toHaveBeenCalled()
            expect(store.instancesById.i1.meta.state).toBe('starting')
            expect(store.instancesById.i1.optimisticStateChange).toBe(false)
            expect(store.instancesById.i1.pendingStateChange).toBe(true)
        })

        it('restores state and rethrows when the action fails', async () => {
            vi.spyOn(instanceApi, 'suspendInstance').mockRejectedValue(new Error('boom'))
            const store = useDataFarmHostedInstancesStore()
            store.instancesById.i1 = instance('i1', 'running')

            await expect(store.suspendInstance('i1')).rejects.toThrow('boom')

            expect(store.instancesById.i1.meta.state).toBe('running')
            expect(store.instancesById.i1.optimisticStateChange).toBe(false)
            expect(store.instancesById.i1.pendingStateChange).toBe(false)
        })

        it('does nothing for an unknown instance', async () => {
            const spy = vi.spyOn(instanceApi, 'restartInstance')
            const store = useDataFarmHostedInstancesStore()
            await store.restartInstance('nope')
            expect(spy).not.toHaveBeenCalled()
        })

        it('a live update mid-transition wins and is not reverted when the request resolves', async () => {
            let resolveStart
            vi.spyOn(instanceApi, 'startInstance').mockReturnValue(new Promise(resolve => { resolveStart = resolve }))
            vi.spyOn(teamApi, 'getInstances').mockResolvedValue({ projects: [instance('i1', 'stopped')], meta: { total: 1 } })
            const store = useDataFarmHostedInstancesStore()
            await store.fetchTeamInstancesPage('team-1')

            const pending = store.startInstance('i1')
            expect(store.instancesById.i1.optimisticStateChange).toBe(true)
            expect(store.instancesById.i1.meta.state).toBe('starting')

            // live status lands while the start request is still in flight
            useLiveStatusStore().setInstanceStatus('i1', 'running')
            store.applyLiveStatus()

            resolveStart({})
            await pending

            expect(store.instancesById.i1.meta.state).toBe('running')
            expect(store.instancesById.i1.optimisticStateChange).toBe(false)
        })
    })

    describe('reset', () => {
        it('clears all state', async () => {
            vi.spyOn(teamApi, 'getInstances').mockResolvedValue({ projects: [instance('i1')], meta: { total: 1 } })
            const store = useDataFarmHostedInstancesStore()
            await store.fetchTeamInstancesPage('team-1')

            store.reset()

            expect(store.instancesById).toEqual({})
            expect(store.currentPageIds).toEqual([])
            expect(store.total).toBe(0)
        })
    })
})
