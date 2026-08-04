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

    describe('page loaders', () => {
        it('starts with no active page loaders', () => {
            const store = useUxLoadingStore()
            expect(store.pageLoaders).toEqual({})
            expect(store.isPageLoading).toBe(false)
        })

        it('setPageLoader registers a key and marks the app as page-loading', () => {
            const store = useUxLoadingStore()
            store.setPageLoader('team-applications')
            expect(store.isPageLoading).toBe(true)
        })

        it('isPageLoading stays true until every registered loader clears', () => {
            const store = useUxLoadingStore()
            store.setPageLoader('a')
            store.setPageLoader('b')
            store.clearPageLoader('a')
            expect(store.isPageLoading).toBe(true)
            store.clearPageLoader('b')
            expect(store.isPageLoading).toBe(false)
        })

        it('clearing an unknown key is a no-op', () => {
            const store = useUxLoadingStore()
            store.clearPageLoader('nope')
            expect(store.isPageLoading).toBe(false)
        })
    })

    describe('$reset', () => {
        it('restores default state', () => {
            const store = useUxLoadingStore()
            store.appLoader = false
            store.offline = true
            store.$reset()
            expect(store.appLoader).toBe(true)
            expect(store.offline).toBeNull()
        })
    })
})
