import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'

const { useUxLoadingStore } = await import('@/stores/ux-loading.js')

describe('ux-loading store', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
    })

    describe('initial state', () => {
        it('initializes with default state', () => {
            const store = useUxLoadingStore()
            expect(store.appLoader).toBe(true)
            expect(store.offline).toBeNull()
        })
    })

    describe('appLoader', () => {
        it('setAppLoader sets appLoader to the given value', () => {
            const store = useUxLoadingStore()
            store.setAppLoader(false)
            expect(store.appLoader).toBe(false)
            store.setAppLoader(true)
            expect(store.appLoader).toBe(true)
        })

        it('clearAppLoader sets appLoader to false', () => {
            const store = useUxLoadingStore()
            store.clearAppLoader()
            expect(store.appLoader).toBe(false)
        })
    })

    describe('offline', () => {
        it('setOffline sets the offline flag', () => {
            const store = useUxLoadingStore()
            store.setOffline(true)
            expect(store.offline).toBe(true)
            store.setOffline(false)
            expect(store.offline).toBe(false)
        })
    })

    describe('page loader', () => {
        it('starts inactive with no message', () => {
            const store = useUxLoadingStore()
            expect(store.pageLoader).toBe(false)
            expect(store.pageLoaderMessage).toBeNull()
        })

        it('setPageLoader with true stores the loader and message', () => {
            const store = useUxLoadingStore()
            store.setPageLoader(true, 'Loading Applications...')
            expect(store.pageLoader).toBe(true)
            expect(store.pageLoaderMessage).toBe('Loading Applications...')
        })

        it('setPageLoader with false clears the loader and message', () => {
            const store = useUxLoadingStore()
            store.setPageLoader(true, 'Loading Applications...')
            store.setPageLoader(false)
            expect(store.pageLoader).toBe(false)
            expect(store.pageLoaderMessage).toBeNull()
        })

        it('setPageLoader with true and no message clears a previously-set message', () => {
            const store = useUxLoadingStore()
            store.setPageLoader(true, 'Loading Applications...')
            store.setPageLoader(true)
            expect(store.pageLoader).toBe(true)
            expect(store.pageLoaderMessage).toBeNull()
        })
    })

    describe('$reset', () => {
        it('restores default state', () => {
            const store = useUxLoadingStore()
            store.appLoader = false
            store.offline = true
            store.setPageLoader(true, 'Loading Applications...')
            store.$reset()
            expect(store.appLoader).toBe(true)
            expect(store.offline).toBeNull()
            expect(store.pageLoader).toBe(false)
            expect(store.pageLoaderMessage).toBeNull()
        })
    })
})
