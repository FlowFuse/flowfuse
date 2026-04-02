import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/api/settings.js', () => ({
    default: {
        getSettings: vi.fn()
    }
}))

vi.mock('@/stores/account-auth.js', () => ({
    useAccountAuthStore: vi.fn()
}))

vi.mock('@/stores/context.js', () => ({
    useContextStore: vi.fn()
}))

// Imported after mocks so vi.mock hoisting resolves correctly
const { useAccountSettingsStore } = await import('@/stores/account-settings.js')
const settingsApi = (await import('@/api/settings.js')).default
const { useAccountAuthStore } = await import('@/stores/account-auth.js')
const { useContextStore } = await import('@/stores/context.js')

function mockAuth ({ admin = false, isAdminUser = false } = {}) {
    useAccountAuthStore.mockReturnValue({ user: { id: 'u1', admin }, isAdminUser })
}

function mockTeam (overrides = {}) {
    useContextStore.mockReturnValue({
        team: {
            id: 'team-1',
            billing: {},
            type: { properties: { billing: {}, features: {}, instances: {} } },
            ...overrides.team
        },
        isTrialAccount: false,
        teamMembership: { role: 1 },
        ...overrides
    })
}

describe('account-settings store', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        vi.clearAllMocks()
        mockAuth()
        mockTeam()
    })

    describe('initial state', () => {
        it('initializes with null settings and empty features', () => {
            const store = useAccountSettingsStore()
            expect(store.settings).toBeNull()
            expect(store.features).toEqual({})
        })
    })

    describe('actions', () => {
        describe('setSettings', () => {
            it('sets settings and extracts features', () => {
                const store = useAccountSettingsStore()
                const settings = { features: { billing: true }, 'team:create': true }
                store.setSettings(settings)
                expect(store.settings).toEqual(settings)
                expect(store.features).toEqual({ billing: true })
            })

            it('sets features to empty object when features key is absent', () => {
                const store = useAccountSettingsStore()
                store.setSettings({ 'team:create': true })
                expect(store.features).toEqual({})
            })
        })

        describe('refreshSettings', () => {
            it('fetches settings from API and stores them', async () => {
                const store = useAccountSettingsStore()
                const settings = { features: { billing: true } }
                settingsApi.getSettings.mockResolvedValue(settings)
                await store.refreshSettings()
                expect(settingsApi.getSettings).toHaveBeenCalledOnce()
                expect(store.settings).toEqual(settings)
                expect(store.features).toEqual({ billing: true })
            })
        })
    })

    describe('getters', () => {
        describe('isBillingEnabled', () => {
            it('returns false when billing feature is not set', () => {
                const store = useAccountSettingsStore()
                expect(store.isBillingEnabled).toBe(false)
            })

            it('returns true when billing feature is enabled', () => {
                const store = useAccountSettingsStore()
                store.setSettings({ features: { billing: true } })
                expect(store.isBillingEnabled).toBe(true)
            })
        })

        describe('requiresBilling', () => {
            it('returns false when billing feature is not enabled', () => {
                const store = useAccountSettingsStore()
                store.setSettings({ features: {} })
                expect(store.requiresBilling).toBeFalsy()
            })

            it('returns false when user is admin', () => {
                mockAuth({ admin: true, isAdminUser: true })
                const store = useAccountSettingsStore()
                store.setSettings({ features: { billing: true } })
                expect(store.requiresBilling).toBeFalsy()
            })

            it('returns true when non-admin user has billing enabled and no active subscription', () => {
                mockAuth({ admin: false })
                mockTeam({ team: { id: 'team-1', billing: { active: false }, type: { properties: { billing: {}, features: {}, instances: {} } } } })
                const store = useAccountSettingsStore()
                store.setSettings({ features: { billing: true } })
                expect(store.requiresBilling).toBe(true)
            })

            it('returns false when team has an active subscription', () => {
                mockAuth({ admin: false })
                mockTeam({ team: { id: 'team-1', billing: { active: true }, type: { properties: { billing: {}, features: {}, instances: {} } } } })
                const store = useAccountSettingsStore()
                store.setSettings({ features: { billing: true } })
                expect(store.requiresBilling).toBeFalsy()
            })

            it('returns false when team billing is unmanaged', () => {
                mockAuth({ admin: false })
                mockTeam({ team: { id: 'team-1', billing: { unmanaged: true }, type: { properties: { billing: {}, features: {}, instances: {} } } } })
                const store = useAccountSettingsStore()
                store.setSettings({ features: { billing: true } })
                expect(store.requiresBilling).toBeFalsy()
            })
        })

        describe('canCreateTeam', () => {
            it('returns true when user is admin regardless of settings', () => {
                mockAuth({ admin: true, isAdminUser: true })
                const store = useAccountSettingsStore()
                store.setSettings({ features: {} })
                expect(store.canCreateTeam).toBe(true)
            })

            it('returns true when settings allow team creation', () => {
                const store = useAccountSettingsStore()
                store.setSettings({ 'team:create': true, features: {} })
                expect(store.canCreateTeam).toBe(true)
            })

            it('returns false when settings disallow team creation', () => {
                const store = useAccountSettingsStore()
                store.setSettings({ 'team:create': false, features: {} })
                expect(store.canCreateTeam).toBe(false)
            })

            it('returns false when team:create is not in settings', () => {
                const store = useAccountSettingsStore()
                store.setSettings({ features: {} })
                expect(store.canCreateTeam).toBe(false)
            })
        })

        describe('featuresCheck', () => {
            it('returns false for isHostedInstancesEnabledForTeam when team is null', () => {
                useContextStore.mockReturnValue({ team: null, teamMembership: { role: 1 }, isTrialAccount: false })
                const store = useAccountSettingsStore()
                expect(store.featuresCheck.isHostedInstancesEnabledForTeam).toBe(false)
            })

            it('isBlueprintsFeatureEnabled is true when enabled on both platform and team', () => {
                mockTeam({ team: { id: 'team-1', billing: {}, type: { properties: { features: { flowBlueprints: true }, billing: {}, instances: {} } } } })
                const store = useAccountSettingsStore()
                store.setSettings({ features: { flowBlueprints: true } })
                expect(store.featuresCheck.isBlueprintsFeatureEnabledForPlatform).toBe(true)
                expect(store.featuresCheck.isBlueprintsFeatureEnabledForTeam).toBe(true)
                expect(store.featuresCheck.isBlueprintsFeatureEnabled).toBe(true)
            })

            it('isBlueprintsFeatureEnabled is false when disabled on platform', () => {
                const store = useAccountSettingsStore()
                store.setSettings({ features: { flowBlueprints: false } })
                expect(store.featuresCheck.isBlueprintsFeatureEnabledForPlatform).toBe(false)
                expect(store.featuresCheck.isBlueprintsFeatureEnabled).toBe(false)
            })

            it('isMqttBrokerFeatureEnabled is true when enabled on both platform and team', () => {
                mockTeam({ team: { id: 'team-1', billing: {}, type: { properties: { features: { teamBroker: true }, billing: {}, instances: {} } } } })
                const store = useAccountSettingsStore()
                store.setSettings({ features: { teamBroker: true } })
                expect(store.featuresCheck.isMqttBrokerFeatureEnabled).toBe(true)
            })

            it('isTablesFeatureEnabled is false when disabled on platform', () => {
                const store = useAccountSettingsStore()
                store.setSettings({ features: { tables: false } })
                expect(store.featuresCheck.isTablesFeatureEnabled).toBe(false)
            })

            it('enableAllFeatures on team type enables all team-level flags', () => {
                mockTeam({ team: { id: 'team-1', billing: {}, type: { properties: { enableAllFeatures: true, billing: {}, instances: {} } } } })
                const store = useAccountSettingsStore()
                store.setSettings({ features: { flowBlueprints: true, teamBroker: true, tables: true } })
                expect(store.featuresCheck.isBlueprintsFeatureEnabledForTeam).toBe(true)
                expect(store.featuresCheck.isMqttBrokerFeatureEnabledForTeam).toBe(true)
                expect(store.featuresCheck.isTablesFeatureEnabledForTeam).toBe(true)
            })

            it('isSharedLibraryFeatureEnabledForTeam defaults to true when flag is absent', () => {
                const store = useAccountSettingsStore()
                store.setSettings({ features: {} })
                // flag undefined on team type → defaults to enabled
                expect(store.featuresCheck.isSharedLibraryFeatureEnabledForTeam).toBe(true)
            })
        })
    })
})
