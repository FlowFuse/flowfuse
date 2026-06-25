import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'

import { useLiveStatusStore } from '@/stores/live-status'

describe('live-status store', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
    })

    it('starts empty and not live', () => {
        const store = useLiveStatusStore()
        expect(store.instanceStatuses).toEqual({})
        expect(store.deviceStatuses).toEqual({})
        expect(store.live).toBe(false)
    })

    describe('setInstanceStatus / setDeviceStatus', () => {
        it('records instance status in the map', () => {
            const store = useLiveStatusStore()
            store.setInstanceStatus('inst-1', 'running')
            expect(store.instanceStatuses['inst-1']).toBe('running')
        })

        it('records device status independently of instance status', () => {
            const store = useLiveStatusStore()
            store.setInstanceStatus('inst-1', 'running')
            store.setDeviceStatus('dev-1', 'stopped')
            expect(store.deviceStatuses['dev-1']).toBe('stopped')
            // the two maps don't bleed into each other
            expect(store.instanceStatuses['dev-1']).toBeUndefined()
            expect(store.deviceStatuses['inst-1']).toBeUndefined()
        })

        it('overwrites an existing id with the latest state', () => {
            const store = useLiveStatusStore()
            store.setInstanceStatus('inst-1', 'running')
            store.setInstanceStatus('inst-1', 'suspended')
            expect(store.instanceStatuses['inst-1']).toBe('suspended')
        })

        it('leaves an unknown id undefined', () => {
            const store = useLiveStatusStore()
            expect(store.instanceStatuses.nope).toBeUndefined()
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

            expect(store.instanceStatuses).toEqual({})
            expect(store.deviceStatuses).toEqual({})
            expect(store.live).toBe(false)
        })
    })
})
