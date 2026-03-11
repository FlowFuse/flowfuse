import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useUxNavigationStore } from '@/stores/ux-navigation.js'

// Prevent _account-bridge from importing the real Vuex store
vi.mock('@/stores/_account-bridge.js', () => ({
    useAccountBridge: vi.fn(() => ({
        team: null,
        features: {},
        teamMembership: { role: 0 },
        featuresCheck: {
            isBlueprintsFeatureEnabledForPlatform: true,
            isCertifiedNodesFeatureEnabledForPlatform: false,
            isHostedInstancesEnabledForTeam: true,
            isDeviceGroupsFeatureEnabled: true,
            devOpsPipelinesFeatureEnabled: true,
            isBOMFeatureEnabled: true,
            isMqttBrokerFeatureEnabled: true,
            isMqttBrokerFeatureEnabledForPlatform: true,
            isInstanceResourcesFeatureEnabled: true,
            isInstanceResourcesFeatureEnabledForPlatform: true,
            isTablesFeatureEnabled: true,
            isTablesFeatureEnabledForPlatform: true,
            isSharedLibraryFeatureEnabledForPlatform: true,
            isSharedLibraryFeatureEnabledForTeam: true
        },
        requiresBilling: false,
        isTrialAccountExpired: false
    }))
}))

const TEAM_STUB = {
    slug: 'test-team',
    createdAt: new Date().toISOString(),
    memberCount: 2
}

const FEATURES_STUB = {
    isBlueprintsFeatureEnabledForPlatform: true,
    isCertifiedNodesFeatureEnabledForPlatform: false,
    isHostedInstancesEnabledForTeam: true,
    isDeviceGroupsFeatureEnabled: true,
    devOpsPipelinesFeatureEnabled: true,
    isBOMFeatureEnabled: true,
    isMqttBrokerFeatureEnabled: true,
    isMqttBrokerFeatureEnabledForPlatform: true,
    isInstanceResourcesFeatureEnabled: true,
    isInstanceResourcesFeatureEnabledForPlatform: true,
    isTablesFeatureEnabled: true,
    isTablesFeatureEnabledForPlatform: true,
    isSharedLibraryFeatureEnabledForPlatform: true,
    isSharedLibraryFeatureEnabledForTeam: true
}

describe('ux-navigation store', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        vi.clearAllMocks()
    })

    it('initializes with team context', () => {
        const store = useUxNavigationStore()
        expect(store.mainNav.context).toBe('team')
        expect(store.overlay).toBe(false)
        expect(store.isNewlyCreatedUser).toBe(false)
    })

    it('openOverlay / closeOverlay toggle the flag', () => {
        const store = useUxNavigationStore()
        store.openOverlay()
        expect(store.overlay).toBe(true)
        store.closeOverlay()
        expect(store.overlay).toBe(false)
    })

    it('checkIfIsNewlyCreatedUser sets flag for recent users', () => {
        const store = useUxNavigationStore()
        const recentDate = new Date()
        recentDate.setDate(recentDate.getDate() - 3) // 3 days ago
        store.checkIfIsNewlyCreatedUser({ createdAt: recentDate.toISOString() })
        expect(store.isNewlyCreatedUser).toBe(true)
    })

    it('checkIfIsNewlyCreatedUser clears flag for old users', () => {
        const store = useUxNavigationStore()
        const oldDate = new Date()
        oldDate.setDate(oldDate.getDate() - 30) // 30 days ago
        store.checkIfIsNewlyCreatedUser({ createdAt: oldDate.toISOString() })
        expect(store.isNewlyCreatedUser).toBe(false)
    })

    it('validateUserAction only updates known keys', () => {
        const store = useUxNavigationStore()
        store.validateUserAction('hasOpenedDeviceEditor')
        expect(store.userActions.hasOpenedDeviceEditor).toBe(true)
        // Unknown key should be ignored
        store.validateUserAction('unknownKey')
        expect(store.userActions).not.toHaveProperty('unknownKey')
    })

    it('setMainNavContext updates the active context', () => {
        const store = useUxNavigationStore()
        store.setMainNavContext('admin')
        expect(store.mainNav.context).toBe('admin')
    })

    it('setMainNavBackButton stores the button object', () => {
        const store = useUxNavigationStore()
        const button = { label: 'Back', to: { name: 'Home' } }
        store.setMainNavBackButton(button)
        expect(store.mainNav.backToButton).toEqual(button)
    })

    it('setNewlyCreatedUser sets the flag to true', () => {
        const store = useUxNavigationStore()
        store.setNewlyCreatedUser()
        expect(store.isNewlyCreatedUser).toBe(true)
    })

    it('$reset restores initial state', () => {
        const store = useUxNavigationStore()
        store.setMainNavContext('admin')
        store.openOverlay()
        store.setNewlyCreatedUser()
        store.validateUserAction('hasOpenedDeviceEditor')

        store.$reset()

        expect(store.mainNav.context).toBe('team')
        expect(store.overlay).toBe(false)
        expect(store.isNewlyCreatedUser).toBe(false)
        expect(store.userActions.hasOpenedDeviceEditor).toBe(false)
    })

    describe('mainNavContext getter', () => {
        it('returns [] when no team and context is team', () => {
            // bridge mock returns team: null by default
            const store = useUxNavigationStore()
            expect(store.mainNavContext).toEqual([])
        })

        it('returns [] for the none context', () => {
            const store = useUxNavigationStore()
            store.setMainNavContext('none')
            expect(store.mainNavContext).toEqual([])
        })

        it('returns admin entries for admin context without requiring a team', () => {
            const store = useUxNavigationStore()
            store.setMainNavContext('admin')
            const allTags = store.mainNavContext.flatMap(g => g.entries.map(e => e.tag))
            expect(allTags).toContain('admin-overview')
            expect(allTags).toContain('admin-users')
        })

        it('returns user settings entries for user context', () => {
            const store = useUxNavigationStore()
            store.setMainNavContext('user')
            const allTags = store.mainNavContext.flatMap(g => g.entries.map(e => e.tag))
            expect(allTags).toContain('account-settings')
            expect(allTags).toContain('account-security')
        })

        it('returns team entries when bridge provides a team', async () => {
            const { useAccountBridge } = await import('@/stores/_account-bridge.js')
            useAccountBridge.mockReturnValue({
                team: TEAM_STUB,
                features: {},
                teamMembership: { role: 50 }, // Owner
                featuresCheck: FEATURES_STUB,
                requiresBilling: false,
                isTrialAccountExpired: false
            })

            const store = useUxNavigationStore()
            store.setMainNavContext('team')
            const allTags = store.mainNavContext.flatMap(g => g.entries.map(e => e.tag))
            expect(allTags).toContain('team-home')
            expect(allTags).toContain('team-instances')
            expect(allTags).toContain('team-members')
        })
    })
})
