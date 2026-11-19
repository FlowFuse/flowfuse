import { describe, expect, test, vi } from 'vitest'

import TeamPage from '../../../../../frontend/src/pages/team/index.vue'

// dispatchTour only reads a few fields and calls store actions, so it runs against a plain object
function teamPage ({ featuresCheck = {}, shouldWakeUpAssistant = false } = {}) {
    return {
        featuresCheck,
        shouldWakeUpAssistant,
        setWelcomeTour: vi.fn(),
        withdrawTour: vi.fn(),
        wakeUpAssistant: vi.fn(),
        openModal: vi.fn()
    }
}

describe('Team page welcome tour', () => {
    test('starts the welcome tour on the classic home', () => {
        const page = teamPage()
        TeamPage.methods.dispatchTour.call(page)
        expect(page.setWelcomeTour).toHaveBeenCalledTimes(1)
        expect(page.withdrawTour).not.toHaveBeenCalled()
    })

    test('opens the getting started modal when the classic tour ends', () => {
        const page = teamPage()
        TeamPage.methods.dispatchTour.call(page)
        page.setWelcomeTour.mock.calls[0][0]()
        expect(page.openModal).toHaveBeenCalledWith('education')
    })

    test('withdraws the tour on the Expert home without opening the getting started modal', () => {
        const page = teamPage({ featuresCheck: { isExpertAssistantFeatureEnabled: true } })
        TeamPage.methods.dispatchTour.call(page)
        expect(page.setWelcomeTour).not.toHaveBeenCalled()
        expect(page.withdrawTour).toHaveBeenCalledTimes(1)
        expect(page.openModal).not.toHaveBeenCalled()
        expect(page.wakeUpAssistant).not.toHaveBeenCalled()
    })

    test('withdraws the tour when the team gets AI onboarding', () => {
        const page = teamPage({ featuresCheck: { isAiOnboardingFeatureEnabled: true } })
        TeamPage.methods.dispatchTour.call(page)
        expect(page.setWelcomeTour).not.toHaveBeenCalled()
        expect(page.withdrawTour).toHaveBeenCalledTimes(1)
    })

    test('still wakes the Expert when it is due and the tour is skipped', () => {
        const page = teamPage({ featuresCheck: { isExpertAssistantFeatureEnabled: true }, shouldWakeUpAssistant: true })
        TeamPage.methods.dispatchTour.call(page)
        expect(page.wakeUpAssistant).toHaveBeenCalledWith({ shouldHydrateMessages: true })
        expect(page.openModal).not.toHaveBeenCalled()
    })
})

// canAutoShowAiConnector only reads a few fields, so it runs against a plain object
function connectorReady ({ aiOnboarding = false, isOnboarding = false } = {}) {
    const page = {
        team: { id: 'team-1' },
        shouldPresentTour: false,
        activeTour: null,
        shouldShowEducationModal: false,
        shouldAutoShowAiConnectorModal: true,
        isOnboarding,
        featuresCheck: { isAiFeatureEnabled: true, isMcpThirdPartyFeatureEnabled: true, isAiOnboardingFeatureEnabled: aiOnboarding }
    }
    return TeamPage.computed.canAutoShowAiConnector.call(page)
}

describe('Team page AI connector dialog', () => {
    test('waits while a team with AI onboarding is still onboarding', () => {
        expect(connectorReady({ aiOnboarding: true, isOnboarding: true })).toBe(false)
    })

    test('shows once AI onboarding is complete', () => {
        expect(connectorReady({ aiOnboarding: true, isOnboarding: false })).toBe(true)
    })

    // Every new user starts in the onboarding stage, which means nothing without AI onboarding
    test('is not held by the onboarding stage on a team without AI onboarding', () => {
        expect(connectorReady({ aiOnboarding: false, isOnboarding: true })).toBe(true)
    })
})
