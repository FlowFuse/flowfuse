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

    describe('onboarding stage', () => {
        function daysAgo (n) {
            const date = new Date()
            date.setDate(date.getDate() - n)
            return date.toISOString()
        }

        it('starts undecided, and neither flag is set', () => {
            const store = useUxStore()
            expect(store.onboardingStage).toBe(null)
            expect(store.isOnboarding).toBe(false)
            expect(store.isOnboardingIntake).toBe(false)
        })

        it('enters intake alongside setNewlyCreatedUser', () => {
            const store = useUxStore()
            store.setNewlyCreatedUser()
            expect(store.onboardingStage).toBe('intake')
            expect(store.isOnboarding).toBe(true)
            expect(store.isOnboardingIntake).toBe(true)
        })

        it('is seeded from the account age while undecided', () => {
            const store = useUxStore()
            store.checkIfIsNewlyCreatedUser({ createdAt: daysAgo(3) })
            expect(store.onboardingStage).toBe('intake')
        })

        it('resolves straight to done for an account older than a week', () => {
            const store = useUxStore()
            store.checkIfIsNewlyCreatedUser({ createdAt: daysAgo(30) })
            expect(store.onboardingStage).toBe('done')
            expect(store.isOnboarding).toBe(false)
        })

        // The Expert keeps being told onboarding is running after it moves the
        // user into the editor, but the onboarding page is finished with
        it('stays onboarding but leaves intake once building starts', () => {
            const store = useUxStore()
            store.setNewlyCreatedUser()
            store.startOnboardingBuild()
            expect(store.isOnboarding).toBe(true)
            expect(store.isOnboardingIntake).toBe(false)
        })

        it('stops onboarding when it ends', () => {
            const store = useUxStore()
            store.setNewlyCreatedUser()
            store.endOnboarding()
            expect(store.isOnboarding).toBe(false)
            expect(store.isOnboardingIntake).toBe(false)
        })

        // isNewlyCreatedUser is recomputed on every boot for a week, so a naive
        // mirror would put someone back into onboarding after they had finished
        it('is not restarted once onboarding has ended', () => {
            const store = useUxStore()
            store.checkIfIsNewlyCreatedUser({ createdAt: daysAgo(1) })
            store.endOnboarding()

            store.checkIfIsNewlyCreatedUser({ createdAt: daysAgo(1) })

            expect(store.isNewlyCreatedUser).toBe(true)
            expect(store.onboardingStage).toBe('done')
        })

        it('leaves isNewlyCreatedUser alone when onboarding ends', () => {
            const store = useUxStore()
            store.setNewlyCreatedUser()
            store.endOnboarding()
            expect(store.isNewlyCreatedUser).toBe(true)
        })
    })

    describe('entering onboarding', () => {
        it('is not pending by default', () => {
            expect(useUxStore().consumeOnboardingEntry()).toBe(false)
        })

        it('is pending after registration', () => {
            const store = useUxStore()
            store.setNewlyCreatedUser()
            expect(store.shouldEnterOnboarding).toBe(true)
        })

        it('only fires once', () => {
            const store = useUxStore()
            store.setNewlyCreatedUser()
            expect(store.consumeOnboardingEntry()).toBe(true)
            expect(store.consumeOnboardingEntry()).toBe(false)
        })

        // An account under a week old resolves to intake on every boot, but
        // that must not keep sending them back to the onboarding page
        it('is not raised by the account-age check', () => {
            const store = useUxStore()
            const recent = new Date()
            recent.setDate(recent.getDate() - 2)
            store.checkIfIsNewlyCreatedUser({ createdAt: recent.toISOString() })
            expect(store.onboardingStage).toBe('intake')
            expect(store.shouldEnterOnboarding).toBe(false)
        })

        it('is dropped when onboarding ends before it was consumed', () => {
            const store = useUxStore()
            store.setNewlyCreatedUser()
            store.endOnboarding()
            expect(store.consumeOnboardingEntry()).toBe(false)
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
