import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

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

vi.mock('@/api/team.js', () => ({
    default: {
        getTeam: vi.fn(),
        getTeamUserMembership: vi.fn()
    }
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

const teamApi = (await import('@/api/team.js')).default
const product = (await import('@/services/product.js')).default

describe('context store', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        vi.clearAllMocks()
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

        it('setDevice sets the device', () => {
            const store = useContextStore()
            const device = { id: 2, name: 'Device' }
            store.setDevice(device)
            expect(store.device).toEqual(device)
        })

        it('clearInstance sets instance to null', () => {
            const store = useContextStore()
            store.setInstance({ id: 1 })
            store.clearInstance()
            expect(store.instance).toBeNull()
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
            it('does nothing when team is null', async () => {
                const store = useContextStore()
                await store.refreshTeam()
                expect(teamApi.getTeam).not.toHaveBeenCalled()
            })

            it('fetches fresh team + membership and updates state', async () => {
                const store = useContextStore()
                const currentTeam = { id: 'team-1', slug: 'alpha' }
                const freshTeam = { id: 'team-1', slug: 'alpha' }
                const membership = { role: 50 }
                store.team = currentTeam
                teamApi.getTeam.mockResolvedValue(freshTeam)
                teamApi.getTeamUserMembership.mockResolvedValue(membership)

                await store.refreshTeam()

                expect(teamApi.getTeam).toHaveBeenCalledWith('team-1')
                expect(store.team).toEqual(freshTeam)
                expect(store.teamMembership).toEqual(membership)
                expect(product.setTeam).toHaveBeenCalledWith(freshTeam)
            })
        })

        describe('refreshTeamMembership', () => {
            it('fetches and updates teamMembership', async () => {
                const store = useContextStore()
                store.team = { id: 'team-1' }
                const membership = { role: 30 }
                teamApi.getTeamUserMembership.mockResolvedValue(membership)

                await store.refreshTeamMembership()

                expect(teamApi.getTeamUserMembership).toHaveBeenCalledWith('team-1')
                expect(store.teamMembership).toEqual(membership)
            })
        })
    })

    describe('getters', () => {
        describe('isFreeTeamType', () => {
            it('returns false when team is null', () => {
                const store = useContextStore()
                expect(store.isFreeTeamType).toBe(false)
            })

            it('returns false when billing is not disabled', () => {
                const store = useContextStore()
                store.team = { type: { properties: { billing: { disabled: false } } } }
                expect(store.isFreeTeamType).toBe(false)
            })

            it('returns true when billing.disabled is true', () => {
                const store = useContextStore()
                store.team = { type: { properties: { billing: { disabled: true } } } }
                expect(store.isFreeTeamType).toBe(true)
            })
        })

        describe('isTrialAccount', () => {
            it('returns false when team has no billing', () => {
                const store = useContextStore()
                store.team = {}
                expect(store.isTrialAccount).toBe(false)
            })

            it('returns true when billing.trial is true', () => {
                const store = useContextStore()
                store.team = { billing: { trial: true } }
                expect(store.isTrialAccount).toBe(true)
            })
        })

        describe('isTrialAccountExpired', () => {
            it('returns false when not a trial account', () => {
                const store = useContextStore()
                store.team = { billing: { trial: false } }
                expect(store.isTrialAccountExpired).toBe(false)
            })

            it('returns false when trial has not ended', () => {
                const store = useContextStore()
                store.team = { billing: { trial: true, trialEnded: false } }
                expect(store.isTrialAccountExpired).toBe(false)
            })

            it('returns true when trial has ended', () => {
                const store = useContextStore()
                store.team = { billing: { trial: true, trialEnded: true } }
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
                store.team = { id: 'team-42', slug: 'my-team' }
                const expert = store.expert
                expect(expert.teamId).toBe('team-42')
                expect(expert.teamSlug).toBe('my-team')
            })
        })
    })
})
