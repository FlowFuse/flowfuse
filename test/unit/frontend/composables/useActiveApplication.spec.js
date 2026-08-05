import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useActiveApplication } from '../../../../frontend/src/composables/useActiveApplication.ts'
import { useDataFarmApplicationsStore } from '../../../../frontend/src/stores/data-farm-applications.ts'

const routerMock = vi.hoisted(() => ({
    push: vi.fn(),
    currentRoute: { value: { path: '/team/t1/applications/a1', query: { q: '1' }, hash: '#h' } }
}))

vi.mock('vue-router', async (importOriginal) => ({
    ...await importOriginal(),
    useRouter: () => routerMock
}))

describe('useActiveApplication', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        routerMock.push.mockClear()
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('returns null and does not touch the store or router when no id is given', async () => {
        const store = useDataFarmApplicationsStore()
        const spy = vi.spyOn(store, 'loadActiveApplication')
        const { loadActiveApplication } = useActiveApplication()

        const result = await loadActiveApplication('')

        expect(result).toBe(null)
        expect(spy).not.toHaveBeenCalled()
        expect(routerMock.push).not.toHaveBeenCalled()
    })

    it('delegates to the store and returns the application', async () => {
        const store = useDataFarmApplicationsStore()
        vi.spyOn(store, 'loadActiveApplication').mockResolvedValue({ id: 'a1', name: 'Detail' })
        const { loadActiveApplication } = useActiveApplication()

        const result = await loadActiveApplication('a1')

        expect(store.loadActiveApplication).toHaveBeenCalledWith('a1')
        expect(result).toEqual({ id: 'a1', name: 'Detail' })
        expect(routerMock.push).not.toHaveBeenCalled()
    })

    it('redirects to page-not-found and returns null when the fetch fails', async () => {
        const store = useDataFarmApplicationsStore()
        vi.spyOn(store, 'loadActiveApplication').mockRejectedValue(new Error('boom'))
        const { loadActiveApplication } = useActiveApplication()

        const result = await loadActiveApplication('a1')

        expect(result).toBe(null)
        expect(routerMock.push).toHaveBeenCalledWith({
            name: 'page-not-found',
            params: { pathMatch: ['team', 't1', 'applications', 'a1'] },
            query: { q: '1' },
            hash: '#h'
        })
    })
})
