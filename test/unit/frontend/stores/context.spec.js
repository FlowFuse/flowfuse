import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useContextStore } from '@/stores/context.js'

// product-expert.js imports ExpertDrawer.vue which pulls in @flowfuse/flow-renderer
// (CJS/ESM conflict). Mock it to keep the test environment clean.
vi.mock('@/stores/product-expert.js', () => ({
    useProductExpertStore: vi.fn(() => ({ isFfAgent: true }))
}))

vi.mock('@/stores/_account_bridge.js', () => ({
    useAccountBridge: () => ({
        userId: null,
        teamId: null,
        teamSlug: null,
        isTrialAccount: false
    })
}))

describe('context store', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
    })

    it('initializes with null state', () => {
        const store = useContextStore()
        expect(store.route).toBeNull()
        expect(store.instance).toBeNull()
        expect(store.device).toBeNull()
    })

    it('updateRoute sets the route', () => {
        const store = useContextStore()
        const route = { name: 'test', fullPath: '/test', params: {} }
        store.updateRoute(route)
        expect(store.route).toEqual(route)
    })

    it('setInstance sets the instance', () => {
        const store = useContextStore()
        const instance = { id: 1, name: 'Instance' }
        store.setInstance(instance)
        expect(store.instance).toEqual(instance)
    })

    it('setDevice sets the device', () => {
        const store = useContextStore()
        const device = { id: 2, name: 'Device' }
        store.setDevice(device)
        expect(store.device).toEqual(device)
    })

    it('clearInstance sets instance to null', () => {
        const store = useContextStore()
        store.setInstance({ id: 1 })
        store.clearInstance()
        expect(store.instance).toBeNull()
    })

    it('expert getter returns safe defaults if route is null', () => {
        const store = useContextStore()
        // The expert getter will return defaults if route is null
        const expert = store.expert
        expect(expert).toHaveProperty('assistantVersion')
        expect(expert).toHaveProperty('palette')
        expect(expert.scope).toBe('ff-app')
    })
})
