import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'

import { useUxStore } from '@/stores/ux.js'

describe('ux store', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
    })

    it('initializes with default state', () => {
        const store = useUxStore()
        expect(store.overlay).toBe(false)
        expect(store.isNewlyCreatedUser).toBe(false)
        expect(store.userActions.hasOpenedDeviceEditor).toBe(false)
    })

    it('openOverlay / closeOverlay toggle the flag', () => {
        const store = useUxStore()
        store.openOverlay()
        expect(store.overlay).toBe(true)
        store.closeOverlay()
        expect(store.overlay).toBe(false)
    })

    it('setNewlyCreatedUser sets the flag to true', () => {
        const store = useUxStore()
        store.setNewlyCreatedUser()
        expect(store.isNewlyCreatedUser).toBe(true)
    })

    it('checkIfIsNewlyCreatedUser sets flag for recent users', () => {
        const store = useUxStore()
        const recentDate = new Date()
        recentDate.setDate(recentDate.getDate() - 3) // 3 days ago
        store.checkIfIsNewlyCreatedUser({ createdAt: recentDate.toISOString() })
        expect(store.isNewlyCreatedUser).toBe(true)
    })

    it('checkIfIsNewlyCreatedUser clears flag for old users', () => {
        const store = useUxStore()
        const oldDate = new Date()
        oldDate.setDate(oldDate.getDate() - 30) // 30 days ago
        store.checkIfIsNewlyCreatedUser({ createdAt: oldDate.toISOString() })
        expect(store.isNewlyCreatedUser).toBe(false)
    })

    describe('isOnboarding', () => {
        function daysAgo (n) {
            const date = new Date()
            date.setDate(date.getDate() - n)
            return date.toISOString()
        }

        it('starts undecided', () => {
            expect(useUxStore().isOnboarding).toBe(null)
        })

        it('is raised alongside setNewlyCreatedUser', () => {
            const store = useUxStore()
            store.setNewlyCreatedUser()
            expect(store.isOnboarding).toBe(true)
        })

        it('is seeded from the account age while undecided', () => {
            const store = useUxStore()
            store.checkIfIsNewlyCreatedUser({ createdAt: daysAgo(3) })
            expect(store.isOnboarding).toBe(true)
        })

        it('stays false for an account older than a week', () => {
            const store = useUxStore()
            store.checkIfIsNewlyCreatedUser({ createdAt: daysAgo(30) })
            expect(store.isOnboarding).toBe(false)
        })

        // isNewlyCreatedUser is recomputed on every boot for a week, so a naive
        // mirror would put someone back into onboarding after they had finished
        it('is not raised again once onboarding has ended', () => {
            const store = useUxStore()
            store.checkIfIsNewlyCreatedUser({ createdAt: daysAgo(1) })
            store.endOnboarding()

            store.checkIfIsNewlyCreatedUser({ createdAt: daysAgo(1) })

            expect(store.isNewlyCreatedUser).toBe(true)
            expect(store.isOnboarding).toBe(false)
        })

        it('leaves isNewlyCreatedUser alone when onboarding ends', () => {
            const store = useUxStore()
            store.setNewlyCreatedUser()
            store.endOnboarding()
            expect(store.isNewlyCreatedUser).toBe(true)
        })
    })

    it('validateUserAction only updates known keys', () => {
        const store = useUxStore()
        store.validateUserAction('hasOpenedDeviceEditor')
        expect(store.userActions.hasOpenedDeviceEditor).toBe(true)
        // Unknown key should be ignored
        store.validateUserAction('unknownKey')
        expect(store.userActions).not.toHaveProperty('unknownKey')
    })

    it('$reset restores initial state', () => {
        const store = useUxStore()
        store.openOverlay()
        store.setNewlyCreatedUser()
        store.validateUserAction('hasOpenedDeviceEditor')

        store.$reset()

        expect(store.overlay).toBe(false)
        expect(store.isNewlyCreatedUser).toBe(false)
        expect(store.userActions.hasOpenedDeviceEditor).toBe(false)
    })
})
