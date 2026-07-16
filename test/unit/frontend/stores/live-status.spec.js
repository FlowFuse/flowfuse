import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'

import { useLiveStatusStore } from '@/stores/live-status'

describe('live-status store', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
    })

    it('starts empty and not live', () => {
        const store = useLiveStatusStore()
        expect(store.instanceMetadata).toEqual({})
        expect(store.deviceStatuses).toEqual({})
        expect(store.live).toBe(false)
    })

    describe('setInstanceStatus / setDeviceStatus', () => {
        it('records instance status in the map', () => {
            const store = useLiveStatusStore()
            store.setInstanceStatus('inst-1', 'running')
            expect(store.instanceMetadata['inst-1']).toEqual({ status: 'running', versions: undefined })
        })

        it('records versions alongside the status when provided', () => {
            const store = useLiveStatusStore()
            store.setInstanceStatus('inst-1', 'running', { 'node-red': '5.0.0', launcher: '2.31.3' })
            expect(store.instanceMetadata['inst-1']).toEqual({ status: 'running', versions: { 'node-red': '5.0.0', launcher: '2.31.3' } })
        })

        it('retains previously-seen versions when a later status carries none', () => {
            const store = useLiveStatusStore()
            store.setInstanceStatus('inst-1', 'starting', { 'node-red': '5.0.0' })
            store.setInstanceStatus('inst-1', 'running')
            expect(store.instanceMetadata['inst-1']).toEqual({ status: 'running', versions: { 'node-red': '5.0.0' } })
        })

        it('records device status independently of instance status', () => {
            const store = useLiveStatusStore()
            store.setInstanceStatus('inst-1', 'running')
            store.setDeviceStatus('dev-1', 'stopped')
            expect(store.deviceStatuses['dev-1']).toBe('stopped')
            // the two maps don't bleed into each other
            expect(store.instanceMetadata['dev-1']).toBeUndefined()
            expect(store.deviceStatuses['inst-1']).toBeUndefined()
        })

        it('overwrites an existing id with the latest state', () => {
            const store = useLiveStatusStore()
            store.setInstanceStatus('inst-1', 'running')
            store.setInstanceStatus('inst-1', 'suspended')
            expect(store.instanceMetadata['inst-1'].status).toBe('suspended')
        })

        it('leaves an unknown id undefined', () => {
            const store = useLiveStatusStore()
            expect(store.instanceMetadata.nope).toBeUndefined()
            expect(store.deviceStatuses.nope).toBeUndefined()
        })
    })

    describe('setLive', () => {
        it('toggles the live flag', () => {
            const store = useLiveStatusStore()
            store.setLive(true)
            expect(store.live).toBe(true)
            store.setLive(false)
            expect(store.live).toBe(false)
        })
    })

    describe('clear', () => {
        it('resets both maps and the live flag (team-switch teardown)', () => {
            const store = useLiveStatusStore()
            store.setInstanceStatus('inst-1', 'running')
            store.setDeviceStatus('dev-1', 'stopped')
            store.setLive(true)

            store.clear()

            expect(store.instanceMetadata).toEqual({})
            expect(store.deviceStatuses).toEqual({})
            expect(store.live).toBe(false)
        })
    })
})
