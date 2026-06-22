import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const STORAGE_KEY = 'ff-theme-mode'

let mqlListener
let storageListener

function setSystemPrefersDark (matches) {
    window.matchMedia = vi.fn().mockImplementation(() => ({
        matches,
        addEventListener: (event, handler) => { mqlListener = handler },
        removeEventListener: vi.fn()
    }))
}

function fireSystemPrefChange (matches) {
    if (mqlListener) mqlListener({ matches })
}

function fireStorageEvent (key, newValue) {
    if (storageListener) storageListener({ key, newValue })
}

beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
    mqlListener = undefined
    storageListener = undefined
    // Capture the storage event listener so tests can fire cross-tab events.
    const originalAdd = window.addEventListener.bind(window)
    vi.spyOn(window, 'addEventListener').mockImplementation((event, handler) => {
        if (event === 'storage') storageListener = handler
        return originalAdd(event, handler)
    })
    setSystemPrefersDark(false)
    setActivePinia(createPinia())
    vi.resetModules()
})

afterEach(() => {
    vi.restoreAllMocks()
})

describe('theme store', () => {
    describe('initial state', () => {
        it('defaults to system mode when localStorage is empty', async () => {
            const { useThemeStore } = await import('@/stores/theme.ts')
            const store = useThemeStore()
            expect(store.mode).toBe('system')
        })

        it('reads stored mode from the dedicated ff-theme-mode key', async () => {
            localStorage.setItem(STORAGE_KEY, 'dark')
            const { useThemeStore } = await import('@/stores/theme.ts')
            const store = useThemeStore()
            expect(store.mode).toBe('dark')
        })

        it('ignores an unrecognized stored value', async () => {
            localStorage.setItem(STORAGE_KEY, 'rainbow')
            const { useThemeStore } = await import('@/stores/theme.ts')
            const store = useThemeStore()
            expect(store.mode).toBe('system')
        })
    })

    describe('effective theme', () => {
        it('returns the explicit mode when set to light or dark', async () => {
            const { useThemeStore } = await import('@/stores/theme.ts')
            const store = useThemeStore()
            store.setMode('dark')
            expect(store.effective).toBe('dark')
            store.setMode('light')
            expect(store.effective).toBe('light')
        })

        it('follows system preference when mode is "system"', async () => {
            setSystemPrefersDark(true)
            const { useThemeStore } = await import('@/stores/theme.ts')
            const store = useThemeStore()
            store.setMode('system')
            expect(store.effective).toBe('dark')
        })

        it('reacts to system preference changes when on system mode', async () => {
            setSystemPrefersDark(false)
            const { useThemeStore } = await import('@/stores/theme.ts')
            const store = useThemeStore()
            store.setMode('system')
            expect(store.effective).toBe('light')
            fireSystemPrefChange(true)
            expect(store.effective).toBe('dark')
        })
    })

    describe('side effects', () => {
        it('writes data-theme to <html> on init', async () => {
            const { useThemeStore } = await import('@/stores/theme.ts')
            useThemeStore()
            await vi.dynamicImportSettled()
            // watchEffect runs after setup; nextTick flushes it
            await Promise.resolve()
            expect(document.documentElement.dataset.theme).toBe('light')
        })

        it('persists mode changes to localStorage under ff-theme-mode', async () => {
            const { useThemeStore } = await import('@/stores/theme.ts')
            const store = useThemeStore()
            store.setMode('dark')
            await Promise.resolve()
            expect(localStorage.getItem(STORAGE_KEY)).toBe('dark')
        })
    })

    describe('cross-tab sync', () => {
        it('updates mode when ff-theme-mode storage event fires', async () => {
            const { useThemeStore } = await import('@/stores/theme.ts')
            const store = useThemeStore()
            expect(store.mode).toBe('system')
            fireStorageEvent(STORAGE_KEY, 'dark')
            expect(store.mode).toBe('dark')
        })

        it('ignores storage events for unrelated keys', async () => {
            const { useThemeStore } = await import('@/stores/theme.ts')
            const store = useThemeStore()
            store.setMode('light')
            fireStorageEvent('unrelated', 'dark')
            expect(store.mode).toBe('light')
        })

        it('ignores storage events with unrecognized values', async () => {
            const { useThemeStore } = await import('@/stores/theme.ts')
            const store = useThemeStore()
            store.setMode('light')
            fireStorageEvent(STORAGE_KEY, 'rainbow')
            expect(store.mode).toBe('light')
        })
    })
})
