import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useUxNavigationStore } from '@/stores/ux-navigation.js'

vi.mock('@/stores/context.js', () => ({
    useContextStore: vi.fn(() => ({
        team: null,
        teamMembership: { role: 0 },
        isTrialAccountExpired: false
    }))
}))

vi.mock('@/stores/account-settings.js', () => ({
    useAccountSettingsStore: vi.fn(() => ({
        features: {},
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
        requiresBilling: false
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

    it('initializes with team context and mobile nav closed', () => {
        const store = useUxNavigationStore()
        expect(store.mainNav.context).toBe('team')
        expect(store.mainNav.backToButton).toBeNull()
        expect(store.mainNav.mobileOpen).toBe(false)
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
        store.openMainNav()

        store.$reset()

        expect(store.mainNav.context).toBe('team')
        expect(store.mainNav.backToButton).toBeNull()
        expect(store.mainNav.mobileOpen).toBe(false)
    })

    // -------------------------------------------------------------------------
    // Mobile MainNav slide-in state — drives the #left-drawer.active class
    // for mobile viewports (< 1024px). On desktop MainNav is always visible.
    // -------------------------------------------------------------------------

    describe('mainNav.mobileOpen', () => {
        it('openMainNav sets mobileOpen=true', () => {
            const store = useUxNavigationStore()
            store.openMainNav()
            expect(store.mainNav.mobileOpen).toBe(true)
        })

        it('closeMainNav sets mobileOpen=false', () => {
            const store = useUxNavigationStore()
            store.openMainNav()
            store.closeMainNav()
            expect(store.mainNav.mobileOpen).toBe(false)
        })

        it('toggleMainNav flips mobileOpen', () => {
            const store = useUxNavigationStore()
            expect(store.mainNav.mobileOpen).toBe(false)
            store.toggleMainNav()
            expect(store.mainNav.mobileOpen).toBe(true)
            store.toggleMainNav()
            expect(store.mainNav.mobileOpen).toBe(false)
        })

        it('mobileOpen is independent of context — switching context preserves it', () => {
            const store = useUxNavigationStore()
            store.openMainNav()
            store.setMainNavContext('admin')
            expect(store.mainNav.mobileOpen).toBe(true)
        })
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

        it('mainNavHidden is true when there is no nav context (e.g. team is null)', () => {
            const store = useUxNavigationStore()
            // default mock returns team: null → mainNavContext is []
            expect(store.mainNavContext).toEqual([])
            expect(store.mainNavHidden).toBe(true)
        })

        it('mainNavHidden is true for the none context', () => {
            const store = useUxNavigationStore()
            store.setMainNavContext('none')
            expect(store.mainNavHidden).toBe(true)
        })

        it('mainNavHidden is false when nav context has entries', () => {
            const store = useUxNavigationStore()
            store.setMainNavContext('admin')
            expect(store.mainNavHidden).toBe(false)
        })

        it('returns team entries when bridge provides a team', async () => {
            const { useContextStore } = await import('@/stores/context.js')
            const { useAccountSettingsStore } = await import('@/stores/account-settings.js')
            vi.mocked(useContextStore).mockReturnValue({
                team: TEAM_STUB,
                teamMembership: { role: 50 }, // Owner
                isTrialAccountExpired: false
            })
            vi.mocked(useAccountSettingsStore).mockReturnValue({
                features: {},
                featuresCheck: FEATURES_STUB,
                requiresBilling: false
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
