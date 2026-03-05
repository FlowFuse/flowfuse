import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'

import { useHydrationStore } from '../../../../frontend/src/stores/hydration.js'

describe('hydration store', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
    })

    it('isHydrated is true when PERSISTED_STORES is empty', () => {
        const store = useHydrationStore()
        expect(store.isHydrated).toBe(true)
    })

    it('markHydrated adds a store id', () => {
        const store = useHydrationStore()
        store.markHydrated('ux-tours')
        expect(store.hydratedStores).toContain('ux-tours')
    })

    it('markHydrated does not add duplicates', () => {
        const store = useHydrationStore()
        store.markHydrated('ux-tours')
        store.markHydrated('ux-tours')
        expect(store.hydratedStores.filter(id => id === 'ux-tours')).toHaveLength(1)
    })
})
