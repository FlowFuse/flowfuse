import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'

import { useDataFarmSchemasStore } from '@/stores/data-farm-schemas'

describe('data-farm-schemas store', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
    })

    it('starts empty', () => {
        const store = useDataFarmSchemasStore()
        expect(store.activeSchema).toBeNull()
        expect(store.activeDraft).toBeNull()
        expect(store.activeLatestPublished).toBeNull()
        expect(store.schemaHydrated).toBe(false)
    })

    it('loads the active schema', async () => {
        const store = useDataFarmSchemasStore()
        await store.loadActiveSchema('abc')
        expect(store.activeSchema.id).toBe('abc')
        expect(store.schemaHydrated).toBe(true)
    })

    it('reset clears the active schema', async () => {
        const store = useDataFarmSchemasStore()
        await store.loadActiveSchema('abc')
        store.reset()
        expect(store.activeSchema).toBeNull()
        expect(store.activeDraft).toBeNull()
        expect(store.schemaHydrated).toBe(false)
    })
})
