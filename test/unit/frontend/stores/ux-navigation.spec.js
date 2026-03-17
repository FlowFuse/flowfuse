import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useUxNavigationStore } from '@/stores/ux-navigation.js'

// Prevent _account-bridge from importing the real Vuex store
vi.mock('@/stores/_account_bridge.js', () => ({
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

// ux-navigation reads isNewlyCreatedUser/userActions from useUxStore inside mainNavContexts
vi.mock('@/stores/ux.js', () => ({
    useUxStore: vi.fn(() => ({
        isNewlyCreatedUser: false,
        userActions: { hasOpenedDeviceEditor: false }
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
        expect(store.mainNav.backToButton).toBeNull()
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

    it('$reset restores initial state', () => {
        const store = useUxNavigationStore()
        store.setMainNavContext('admin')
        store.setMainNavBackButton({ label: 'Back' })

        store.$reset()

        expect(store.mainNav.context).toBe('team')
        expect(store.mainNav.backToButton).toBeNull()
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
            const { useAccountBridge } = await import('@/stores/_account_bridge.js')
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
