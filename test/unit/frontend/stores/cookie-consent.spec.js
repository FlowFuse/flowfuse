import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useCookieConsentStore } from '@/stores/cookie-consent'

describe('cookie-consent store', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        window.posthog = { opt_in_capturing: vi.fn(), opt_out_capturing: vi.fn() }
        window._ffLoadHubSpot = vi.fn()
        window._ffLoadGoogleAnalytics = vi.fn()
    })

    afterEach(() => {
        delete window.posthog
        delete window._ffLoadHubSpot
        delete window._ffLoadGoogleAnalytics
    })

    describe('shouldShowBanner', () => {
        it('is true before a decision when analytics are enabled', () => {
            const store = useCookieConsentStore()
            expect(store.shouldShowBanner).toBe(true)
        })

        it('is false once a decision has been made', () => {
            const store = useCookieConsentStore()
            store.decision = 'rejected'
            expect(store.shouldShowBanner).toBe(false)
        })

        it('is false when no analytics tools are configured (self-hosted)', () => {
            delete window.posthog
            delete window._ffLoadHubSpot
            delete window._ffLoadGoogleAnalytics
            const store = useCookieConsentStore()
            expect(store.analyticsEnabled).toBe(false)
            expect(store.shouldShowBanner).toBe(false)
        })
    })

    describe('accept', () => {
        it('opts into PostHog and loads HubSpot + Google Analytics', () => {
            const store = useCookieConsentStore()
            store.accept()
            expect(store.decision).toBe('accepted')
            expect(window.posthog.opt_in_capturing).toHaveBeenCalled()
            expect(window._ffLoadHubSpot).toHaveBeenCalled()
            expect(window._ffLoadGoogleAnalytics).toHaveBeenCalled()
        })
    })

    describe('reject', () => {
        it('opts out of PostHog and does not load HubSpot or Google Analytics', () => {
            const store = useCookieConsentStore()
            store.reject()
            expect(store.decision).toBe('rejected')
            expect(window.posthog.opt_out_capturing).toHaveBeenCalled()
            expect(window._ffLoadHubSpot).not.toHaveBeenCalled()
            expect(window._ffLoadGoogleAnalytics).not.toHaveBeenCalled()
        })
    })

    describe('applyDecision', () => {
        it('re-applies an accepted decision', () => {
            const store = useCookieConsentStore()
            store.decision = 'accepted'
            store.applyDecision()
            expect(window.posthog.opt_in_capturing).toHaveBeenCalled()
            expect(window._ffLoadHubSpot).toHaveBeenCalled()
        })

        it('re-applies a rejected decision', () => {
            const store = useCookieConsentStore()
            store.decision = 'rejected'
            store.applyDecision()
            expect(window.posthog.opt_out_capturing).toHaveBeenCalled()
        })

        it('does nothing when no decision has been stored', () => {
            const store = useCookieConsentStore()
            store.applyDecision()
            expect(window.posthog.opt_in_capturing).not.toHaveBeenCalled()
            expect(window.posthog.opt_out_capturing).not.toHaveBeenCalled()
        })
    })

    describe('reset', () => {
        it('clears the decision so the banner shows again', () => {
            const store = useCookieConsentStore()
            store.decision = 'accepted'
            store.reset()
            expect(store.decision).toBeNull()
        })
    })
})
