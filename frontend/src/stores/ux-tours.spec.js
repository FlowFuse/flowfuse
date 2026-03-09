import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { markRaw } from 'vue'

import { useUxToursStore } from '@/stores/ux-tours.js'

describe('ux-tours store', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
    })

    it('initializes with default state', () => {
        const store = useUxToursStore()
        expect(store.shouldPresentTour).toBe(false)
        expect(store.activeTour).toBeNull()
        expect(store.completed).toEqual({})
    })

    it('activateTour sets the tour flag to true', () => {
        const store = useUxToursStore()
        store.activateTour('welcome')
        expect(store.tours.welcome).toBe(true)
    })

    it('deactivateTour disables the tour and marks it completed', () => {
        const store = useUxToursStore()
        store.activateTour('welcome')
        store.deactivateTour('welcome')
        expect(store.tours.welcome).toBe(false)
        expect(store.hasTourBeenCompleted('welcome')).toBe(true)
    })

    it('resetTours clears all active tours and completed map', () => {
        const store = useUxToursStore()
        store.deactivateTour('welcome')
        store.resetTours()
        expect(store.completed).toEqual({})
        expect(Object.values(store.tours).every(v => v === false)).toBe(true)
    })

    it('setActiveTour wraps tour in markRaw to prevent proxying', () => {
        const store = useUxToursStore()
        const fakeTour = markRaw({ isActive: () => false })
        store.setActiveTour(fakeTour)
        expect(store.activeTour).toBe(fakeTour)
    })

    it('setActiveTour does not replace an already active tour', () => {
        const store = useUxToursStore()
        const activeTour = markRaw({ isActive: () => true })
        const newTour = markRaw({ isActive: () => false })
        store.setActiveTour(activeTour)
        store.setActiveTour(newTour)
        expect(store.activeTour).toBe(activeTour)
    })

    it('clearActiveTour nulls the active tour', () => {
        const store = useUxToursStore()
        store.activeTour = markRaw({ isActive: () => false })
        store.clearActiveTour()
        expect(store.activeTour).toBeNull()
    })

    it('presentTour / withdrawTour toggle shouldPresentTour', () => {
        const store = useUxToursStore()
        store.presentTour()
        expect(store.shouldPresentTour).toBe(true)
        store.withdrawTour()
        expect(store.shouldPresentTour).toBe(false)
    })

    it('openModal / closeModal toggle the modal flag', () => {
        const store = useUxToursStore()
        store.openModal('education')
        expect(store.shouldShowEducationModal).toBe(true)
        store.closeModal('education')
        expect(store.shouldShowEducationModal).toBe(false)
    })

    it('hasTourBeenCompleted returns false for unknown tours', () => {
        const store = useUxToursStore()
        expect(store.hasTourBeenCompleted('nonexistent')).toBe(false)
    })

    it('startTour calls start on the active tour after delay', () => {
        vi.useFakeTimers()
        const store = useUxToursStore()
        const fakeTour = markRaw({ isActive: () => false, start: vi.fn() })
        store.setActiveTour(fakeTour)
        store.startTour()
        vi.advanceTimersByTime(1000)
        expect(fakeTour.start).toHaveBeenCalledOnce()
        vi.useRealTimers()
    })
})
