import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useAccountSettingsStore } from '@/stores/account-settings.js'
import { useContextStore } from '@/stores/context.js'

// account-auth.js imports routes.js which loads the full Vue component tree
// (including components that pull in @flowfuse/flow-renderer — a CJS/ESM conflict).
// Mock it to keep the test environment clean.
vi.mock('@/stores/account-auth.js', () => ({
    useAccountAuthStore: vi.fn(() => ({ user: null }))
}))

// product-expert.js imports ExpertDrawer.vue which pulls in @flowfuse/flow-renderer
// (CJS/ESM conflict). Mock it to keep the test environment clean.
vi.mock('@/stores/product-expert.js', () => ({
    useProductExpertStore: vi.fn(() => ({ isSupportAgent: true }))
}))

// Active-team state now lives in data-farm-teams; context delegates to it.
const teamsStore = vi.hoisted(() => {
    const s = { activeTeam: null, activeTeamMembership: null }
    s.setActiveTeam = vi.fn((t) => { s.activeTeam = t ?? null })
    s.setActiveTeamMembership = vi.fn((m) => { s.activeTeamMembership = m ?? null })
    s.refreshActiveTeam = vi.fn()
    s.refreshActiveMembership = vi.fn()
    return s
})

vi.mock('@/stores/data-farm-teams', () => ({
    useDataFarmTeamsStore: () => teamsStore
}))

vi.mock('@/routes.js', () => ({
    default: {
        replace: vi.fn(),
        currentRoute: { value: { name: 'TeamRoute', params: {} } }
    }
}))

vi.mock('@/services/product.js', () => ({
    default: {
        setTeam: vi.fn()
    }
}))

const product = (await import('@/services/product.js')).default
const router = (await import('@/routes.js')).default

describe('context store', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        vi.clearAllMocks()
        teamsStore.activeTeam = null
        teamsStore.activeTeamMembership = null
    })

    describe('initial state', () => {
        it('initializes with null state', () => {
            const store = useContextStore()
            expect(store.route).toBeNull()
            expect(store.instance).toBeNull()
            expect(store.device).toBeNull()
            expect(store.team).toBeNull()
            expect(store.teamMembership).toBeNull()
        })
    })

    describe('route / instance / device actions', () => {
        it('updateRoute sets the route', () => {
            const store = useContextStore()
            const route = { name: 'test', fullPath: '/test', params: {} }
            store.updateRoute(route)
            expect(store.route).toEqual(route)
        })

        it('setInstance sets the instance', () => {
            const store = useContextStore()
            const instance = { id: 1, name: 'Instance' }
            store.setInstance(instance)
            expect(store.instance).toEqual(instance)
        })

        it('setInstance registers the instance owning application', () => {
            const store = useContextStore()
            const application = { id: 'app-1', name: 'App' }
            store.setInstance({ id: 1, name: 'Instance', application })
            expect(store.application).toEqual({ id: 'app-1', name: 'App', description: undefined })
        })

        it('setInstance(null) also clears the application', () => {
            const store = useContextStore()
            store.setInstance({ id: 1, name: 'Instance', application: { id: 'app-1' } })
            store.setInstance(null)
            expect(store.instance).toBeNull()
            expect(store.application).toBeNull()
        })

        it('setDevice sets the device', () => {
            const store = useContextStore()
            const device = { id: 2, name: 'Device' }
            store.setDevice(device)
            expect(store.device).toEqual(device)
        })

        it('setDevice registers the device owning application when directly owned', () => {
            const store = useContextStore()
            const application = { id: 'app-1', name: 'App' }
            store.setDevice({ id: 2, application })
            expect(store.application).toEqual({ id: 'app-1', name: 'App', description: undefined })
            expect(store.instance).toBeNull()
        })

        it('setDevice registers the owning instance and its application when owned by an instance', () => {
            const store = useContextStore()
            // The device's `instance` is an InstanceSummary and never carries its own `application` -
            // the backend resolves the owning application onto the device itself as a sibling field.
            const application = { id: 'app-1', name: 'App' }
            const instance = { id: 'inst-1', name: 'Instance' }
            store.setDevice({ id: 2, instance, application })
            expect(store.instance).toEqual(instance)
            expect(store.application).toEqual({ id: 'app-1', name: 'App', description: undefined })
        })

        it('setDevice keeps the device but clears any stale owner when the device has no owner', () => {
            const store = useContextStore()
            store.setInstance({ id: 'inst-1', application: { id: 'app-1' } })
            const device = { id: 2, name: 'Unassigned device' }
            store.setDevice(device)
            expect(store.device).toEqual(device)
            expect(store.instance).toBeNull()
            expect(store.application).toBeNull()
        })

        it('setDevice(null) clears the device, instance and application', () => {
            const store = useContextStore()
            const application = { id: 'app-1' }
            const instance = { id: 'inst-1' }
            store.setDevice({ id: 2, instance, application })
            store.setDevice(null)
            expect(store.device).toBeNull()
            expect(store.instance).toBeNull()
            expect(store.application).toBeNull()
        })

        it('clearInstance sets instance to null', () => {
            const store = useContextStore()
            store.setInstance({ id: 1 })
            store.clearInstance()
            expect(store.instance).toBeNull()
        })

        it('clearInstance also clears the application it cascaded to', () => {
            const store = useContextStore()
            store.setInstance({ id: 1, application: { id: 'app-1' } })
            store.clearInstance()
            expect(store.application).toBeNull()
        })
    })

    describe('team actions', () => {
        describe('setTeamMembership', () => {
            it('sets teamMembership', () => {
                const store = useContextStore()
                const membership = { role: 50 }
                store.setTeamMembership(membership)
                expect(store.teamMembership).toEqual(membership)
            })
        })

        describe('refreshTeam', () => {
            it('does nothing when there is no active team', async () => {
                const store = useContextStore()
                await store.refreshTeam()
                expect(teamsStore.refreshActiveTeam).not.toHaveBeenCalled()
            })

            it('delegates the fetch to the store and applies analytics', async () => {
                const store = useContextStore()
                store.setTeam({ id: 'team-1', slug: 'alpha' })
                teamsStore.refreshActiveTeam.mockResolvedValue({ id: 'team-1', slug: 'alpha' })

                await store.refreshTeam()

                expect(teamsStore.refreshActiveTeam).toHaveBeenCalled()
                expect(product.setTeam).toHaveBeenCalledWith({ id: 'team-1', slug: 'alpha' })
                expect(router.replace).not.toHaveBeenCalled()
            })
        })

        describe('refreshTeamMembership', () => {
            it('delegates to the store', async () => {
                const store = useContextStore()
                store.setTeam({ id: 'team-1' })

                await store.refreshTeamMembership()

                expect(teamsStore.refreshActiveMembership).toHaveBeenCalled()
            })
        })

        describe('onTeamChannelMembership', () => {
            it('refreshes membership for a non-removal reason', async () => {
                const store = useContextStore()
                store.setTeam({ id: 'team-1' })

                await store.onTeamChannelMembership({ reason: 'role-changed' })

                expect(teamsStore.refreshActiveMembership).toHaveBeenCalled()
            })

            it('hard-reloads to / on removal when on a team route', async () => {
                const assign = vi.fn()
                Object.defineProperty(window, 'location', {
                    writable: true,
                    value: { pathname: '/team/abc/instances', assign }
                })
                const store = useContextStore()

                await store.onTeamChannelMembership({ reason: 'removed' })

                expect(assign).toHaveBeenCalledWith('/')
                expect(teamsStore.refreshActiveMembership).not.toHaveBeenCalled()
            })

            it('does not reload on removal when on a non-team route', async () => {
                const assign = vi.fn()
                Object.defineProperty(window, 'location', {
                    writable: true,
                    value: { pathname: '/account/settings', assign }
                })
                const store = useContextStore()

                await store.onTeamChannelMembership({ reason: 'removed' })

                expect(assign).not.toHaveBeenCalled()
            })
        })
    })

    describe('getters', () => {
        describe('isImmersive', () => {
            it('returns false when there is no route', () => {
                const store = useContextStore()
                expect(store.isImmersive).toBe(false)
            })

            it('returns false when the route layout is not immersive', () => {
                const store = useContextStore()
                store.updateRoute({ name: 'device-overview', meta: { layout: 'platform' } })
                expect(store.isImmersive).toBe(false)
            })

            it('returns true when the route layout is immersive', () => {
                const store = useContextStore()
                store.updateRoute({ name: 'device-editor', meta: { layout: 'immersive' } })
                expect(store.isImmersive).toBe(true)
            })
        })

        describe('isFreeTeamType', () => {
            it('returns false when team is null', () => {
                const store = useContextStore()
                expect(store.isFreeTeamType).toBe(false)
            })

            it('returns false when billing is not disabled', () => {
                const store = useContextStore()
                store.setTeam({ type: { properties: { billing: { disabled: false } } } })
                expect(store.isFreeTeamType).toBe(false)
            })

            it('returns true when billing.disabled is true', () => {
                const store = useContextStore()
                store.setTeam({ type: { properties: { billing: { disabled: true } } } })
                expect(store.isFreeTeamType).toBe(true)
            })
        })

        describe('isTrialAccount', () => {
            it('returns false when team has no billing', () => {
                const store = useContextStore()
                store.setTeam({})
                expect(store.isTrialAccount).toBe(false)
            })

            it('returns true when billing.trial is true', () => {
                const store = useContextStore()
                store.setTeam({ billing: { trial: true } })
                expect(store.isTrialAccount).toBe(true)
            })
        })

        describe('isTrialAccountExpired', () => {
            it('returns false when not a trial account', () => {
                const store = useContextStore()
                store.setTeam({ billing: { trial: false } })
                expect(store.isTrialAccountExpired).toBe(false)
            })

            it('returns false when trial has not ended', () => {
                const store = useContextStore()
                store.setTeam({ billing: { trial: true, trialEnded: false } })
                expect(store.isTrialAccountExpired).toBe(false)
            })

            it('returns true when trial has ended', () => {
                const store = useContextStore()
                store.setTeam({ billing: { trial: true, trialEnded: true } })
                expect(store.isTrialAccountExpired).toBe(true)
            })
        })

        describe('editorEntityType', () => {
            it('returns null when route is null', () => {
                const store = useContextStore()
                expect(store.editorEntityType).toBe(null)
            })

            it('returns null when route name does not match an editor route', () => {
                const store = useContextStore()
                store.updateRoute({ name: 'team-overview', fullPath: '/team', params: {} })
                expect(store.editorEntityType).toBe(null)
            })

            it("returns 'instance' for instance editor routes", () => {
                const store = useContextStore()
                store.updateRoute({ name: 'instance-editor-overview', fullPath: '/instance/123/editor', params: { id: '123' } })
                expect(store.editorEntityType).toBe('instance')
            })

            it("returns 'device' for device editor routes", () => {
                const store = useContextStore()
                store.updateRoute({ name: 'device-editor-overview', fullPath: '/device/456/editor', params: { id: '456' } })
                expect(store.editorEntityType).toBe('device')
            })
        })

        describe('isImmersiveEditor', () => {
            it('returns false when editorEntityType is null', () => {
                const store = useContextStore()
                expect(store.isImmersiveEditor).toBe(false)
            })

            it('returns true on instance editor routes', () => {
                const store = useContextStore()
                store.updateRoute({ name: 'instance-editor-settings', fullPath: '/instance/1/editor/settings', params: { id: '1' } })
                expect(store.isImmersiveEditor).toBe(true)
            })

            it('returns true on device editor routes', () => {
                const store = useContextStore()
                store.updateRoute({ name: 'device-editor-expert', fullPath: '/device/2/editor/expert', params: { id: '2' } })
                expect(store.isImmersiveEditor).toBe(true)
            })
        })

        describe('expert getter', () => {
            it('returns safe defaults if route is null', () => {
                const store = useContextStore()
                const expert = store.expert
                expect(expert).toHaveProperty('assistantVersion')
                expect(expert).toHaveProperty('palette')
                expect(expert.scope).toBe('ff-app')
            })

            it('includes teamId and teamSlug from context team', () => {
                const store = useContextStore()
                store.setTeam({ id: 'team-42', slug: 'my-team' })
                const expert = store.expert
                expect(expert.teamId).toBe('team-42')
                expect(expert.teamSlug).toBe('my-team')
            })

            it('sets telemetryEnabled from the platform setting', () => {
                const store = useContextStore()
                const settingsStore = useAccountSettingsStore()
                settingsStore.settings = { 'telemetry:enabled': true }
                expect(store.expert.telemetryEnabled).toBe(true)
                settingsStore.settings = { 'telemetry:enabled': false }
                expect(store.expert.telemetryEnabled).toBe(false)
            })

            it('defaults telemetryEnabled to false when the setting is unavailable', () => {
                const store = useContextStore()
                expect(store.expert.telemetryEnabled).toBe(false)
            })

            it('marks deployment cloud only when telemetry:anonymize is false', () => {
                const store = useContextStore()
                const settingsStore = useAccountSettingsStore()

                settingsStore.settings = { 'telemetry:anonymize': false }
                expect(store.expert.deployment).toBe('cloud')

                settingsStore.settings = { 'telemetry:anonymize': true }
                expect(store.expert.deployment).toBe('self-hosted')
            })

            it('defaults deployment to self-hosted when the setting is unavailable', () => {
                const store = useContextStore()
                expect(store.expert.deployment).toBe('self-hosted')
            })

            it('resolves applicationId for a device owned directly by an application', () => {
                const store = useContextStore()
                store.updateRoute({ name: 'device-overview' })
                store.setTeamMembership({ role: 30 })
                store.setDevice({ id: 'device-1', ownerType: 'application', application: { id: 'app-1' } })
                const expert = store.expert
                expect(expert.deviceId).toBe('device-1')
                expect(expert.applicationId).toBe('app-1')
                expect(expert.instanceId).toBeNull()
                expect(expert.deviceOwnerType).toBe('application')
            })

            it('resolves instanceId and applicationId for a device owned by an instance', () => {
                const store = useContextStore()
                store.updateRoute({ name: 'device-overview' })
                store.setTeamMembership({ role: 30 })
                store.setDevice({
                    id: 'device-1',
                    ownerType: 'instance',
                    instance: { id: 'instance-1' },
                    application: { id: 'app-1' }
                })
                const expert = store.expert
                expect(expert.deviceId).toBe('device-1')
                expect(expert.instanceId).toBe('instance-1')
                expect(expert.applicationId).toBe('app-1')
                expect(expert.deviceOwnerType).toBe('instance')
            })

            it('resolves deviceId with a null applicationId/instanceId for an unassigned device', () => {
                const store = useContextStore()
                store.updateRoute({ name: 'device-overview' })
                store.setTeamMembership({ role: 30 })
                store.setDevice({ id: 'device-1', ownerType: null })
                const expert = store.expert
                expect(expert.deviceId).toBe('device-1')
                expect(expert.applicationId).toBeNull()
                expect(expert.instanceId).toBeNull()
                expect(expert.deviceOwnerType).toBeNull()
            })

            it('reflects the route layout in scope', () => {
                const store = useContextStore()
                store.updateRoute({ name: 'device-overview', meta: {} })
                store.setTeamMembership({ role: 30 })
                expect(store.expert.scope).toBe('ff-app')
                store.updateRoute({ name: 'device-editor', meta: { layout: 'immersive' } })
                expect(store.expert.scope).toBe('immersive')
            })
        })
    })
})
