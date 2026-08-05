import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// setTeam resolves teams via the data-farm store; membership refresh delegates through context.
const teamsStore = vi.hoisted(() => ({ fetchTeam: vi.fn() }))

vi.mock('@/stores/data-farm-teams', () => ({
    useDataFarmTeamsStore: () => teamsStore
}))

vi.mock('@/api/flowBlueprints.js', () => ({
    default: {
        getFlowBlueprintsForTeam: vi.fn()
    }
}))

vi.mock('@/api/user.js', () => ({
    default: {
        getNotifications: vi.fn(),
        getTeamInvitations: vi.fn()
    }
}))

vi.mock('@/services/product.js', () => ({
    default: {
        setTeam: vi.fn()
    }
}))

vi.mock('@/stores/product-tables.js', () => ({
    useProductTablesStore: () => ({ clearState: vi.fn() })
}))

// Shared mutable state used by the context store mock
const mockContext = {
    team: null,
    teamMembership: null,
    setTeam (team) { this.team = team },
    setTeamMembership (membership) { this.teamMembership = membership },
    refreshTeamMembership: vi.fn()
}

vi.mock('@/stores/context.js', () => ({
    useContextStore: () => mockContext
}))

// Imported after mocks so vi.mock hoisting resolves correctly
const { useAccountStore } = await import('@/stores/account.js')
const flowBlueprintsApi = (await import('@/api/flowBlueprints.js')).default
const userApi = (await import('@/api/user.js')).default
const product = (await import('@/services/product.js')).default

describe('account store', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        vi.clearAllMocks()
        // Reset shared context mock state
        mockContext.team = null
        mockContext.teamMembership = null
    })

    describe('initial state', () => {
        it('initializes with default state', () => {
            const store = useAccountStore()
            expect(store.teamBlueprints).toEqual({})
            expect(store.pendingTeamChange).toBe(false)
            expect(store.notifications).toEqual([])
            expect(store.invitations).toEqual([])
        })
    })

    describe('getters', () => {
        describe('blueprints', () => {
            it('returns empty array when context team is null', () => {
                const store = useAccountStore()
                expect(store.blueprints).toEqual([])
            })

            it('returns blueprints for the current team from context', () => {
                mockContext.team = { id: 'team-1' }
                const store = useAccountStore()
                store.teamBlueprints = { 'team-1': [{ id: 'bp-1' }] }
                expect(store.blueprints).toEqual([{ id: 'bp-1' }])
            })

            it('returns empty array when no blueprints for current team', () => {
                mockContext.team = { id: 'team-1' }
                const store = useAccountStore()
                store.teamBlueprints = {}
                expect(store.blueprints).toEqual([])
            })
        })

        describe('defaultBlueprint', () => {
            it('returns undefined when no blueprints', () => {
                const store = useAccountStore()
                expect(store.defaultBlueprint).toBeUndefined()
            })

            it('returns the blueprint marked as default', () => {
                mockContext.team = { id: 'team-1' }
                const store = useAccountStore()
                store.teamBlueprints = {
                    'team-1': [
                        { id: 'bp-1', default: false },
                        { id: 'bp-2', default: true }
                    ]
                }
                expect(store.defaultBlueprint).toEqual({ id: 'bp-2', default: true })
            })
        })

        describe('notificationsCount', () => {
            it('returns 0 when notifications is initial state', () => {
                const store = useAccountStore()
                expect(store.notificationsCount).toBe(0)
            })

            it('returns the length of the notifications array', () => {
                const store = useAccountStore()
                store.notifications = [{ id: 1 }, { id: 2 }]
                expect(store.notificationsCount).toBe(2)
            })
        })

        describe('unreadNotificationsCount', () => {
            it('returns 0 when no notifications', () => {
                const store = useAccountStore()
                store.notifications = []
                expect(store.unreadNotificationsCount).toBe(0)
            })

            it('counts unread notifications', () => {
                const store = useAccountStore()
                store.notifications = [
                    { id: 1, read: false, data: { meta: {} } },
                    { id: 2, read: true, data: { meta: {} } }
                ]
                expect(store.unreadNotificationsCount).toBe(1)
            })

            it('adds grouped notification counter values', () => {
                const store = useAccountStore()
                store.notifications = [
                    { id: 1, read: false, data: { meta: { counter: 3 } } }
                ]
                // 1 (base) + (3 - 1) = 3
                expect(store.unreadNotificationsCount).toBe(3)
            })
        })

        describe('hasNotifications', () => {
            it('returns false when empty', () => {
                const store = useAccountStore()
                store.notifications = []
                expect(store.hasNotifications).toBe(false)
            })

            it('returns true when there are notifications', () => {
                const store = useAccountStore()
                store.notifications = [{ id: 1 }]
                expect(store.hasNotifications).toBe(true)
            })
        })

        describe('teamInvitations / teamInvitationsCount', () => {
            it('returns invitations array', () => {
                const store = useAccountStore()
                store.invitations = [{ id: 'inv-1' }]
                expect(store.teamInvitations).toEqual([{ id: 'inv-1' }])
                expect(store.teamInvitationsCount).toBe(1)
            })
        })
    })

    describe('actions', () => {
        describe('setTeam', () => {
            it('refreshes membership but skips full reload when the same team is already active (by id)', async () => {
                const store = useAccountStore()
                const team = { id: 'team-1', slug: 'alpha' }
                mockContext.team = team

                await store.setTeam(team)

                expect(mockContext.refreshTeamMembership).toHaveBeenCalled()
                expect(mockContext.team).toEqual(team)
                // no full switch — analytics + store reset are skipped
                expect(product.setTeam).not.toHaveBeenCalled()
            })

            it('does nothing if both current and new team are null', async () => {
                const store = useAccountStore()
                await store.setTeam(null)
                expect(mockContext.refreshTeamMembership).not.toHaveBeenCalled()
                expect(product.setTeam).not.toHaveBeenCalled()
            })

            it('switches to a team object: sets it, refreshes membership, calls product.setTeam', async () => {
                const store = useAccountStore()
                const team = { id: 'team-2', slug: 'beta' }

                await store.setTeam(team)

                expect(mockContext.team).toEqual(team)
                expect(mockContext.refreshTeamMembership).toHaveBeenCalled()
                expect(product.setTeam).toHaveBeenCalledWith(team)
                expect(store.pendingTeamChange).toBe(false)
            })

            it('resolves the team by slug via the store when passed a string', async () => {
                const store = useAccountStore()
                const fetchedTeam = { id: 'team-3', slug: 'gamma' }
                teamsStore.fetchTeam.mockResolvedValue(fetchedTeam)

                await store.setTeam('gamma')

                expect(teamsStore.fetchTeam).toHaveBeenCalledWith({ slug: 'gamma' })
                expect(mockContext.team).toEqual(fetchedTeam)
                expect(product.setTeam).toHaveBeenCalledWith(fetchedTeam)
            })
        })

        describe('getTeamBlueprints', () => {
            it('fetches and stores blueprints for the given team', async () => {
                const store = useAccountStore()
                const blueprints = [{ id: 'bp-1' }, { id: 'bp-2' }]
                flowBlueprintsApi.getFlowBlueprintsForTeam.mockResolvedValue({ blueprints })

                await store.getTeamBlueprints('team-1')

                expect(flowBlueprintsApi.getFlowBlueprintsForTeam).toHaveBeenCalledWith('team-1')
                expect(store.teamBlueprints['team-1']).toEqual(blueprints)
            })
        })

        describe('getNotifications', () => {
            it('sets notifications from API response', async () => {
                const store = useAccountStore()
                const notifications = [{ id: 'n1' }, { id: 'n2' }]
                userApi.getNotifications.mockResolvedValue({ notifications })

                await store.getNotifications()

                expect(store.notifications).toEqual(notifications)
            })

            it('sets notifications to empty array when API returns no notifications key', async () => {
                const store = useAccountStore()
                userApi.getNotifications.mockResolvedValue({})

                await store.getNotifications()

                expect(store.notifications).toEqual([])
            })

            it('does not throw on API failure', async () => {
                const store = useAccountStore()
                userApi.getNotifications.mockRejectedValue(new Error('network'))
                await expect(store.getNotifications()).resolves.not.toThrow()
            })
        })

        describe('setNotifications', () => {
            it('directly sets notifications', () => {
                const store = useAccountStore()
                const notifications = [{ id: 'n1' }]
                store.setNotifications(notifications)
                expect(store.notifications).toEqual(notifications)
            })
        })

        describe('getInvitations', () => {
            it('sets invitations from API response', async () => {
                const store = useAccountStore()
                const invitations = [{ id: 'inv-1' }]
                userApi.getTeamInvitations.mockResolvedValue({ invitations })

                await store.getInvitations()

                expect(store.invitations).toEqual(invitations)
            })

            it('does not throw on API failure', async () => {
                const store = useAccountStore()
                userApi.getTeamInvitations.mockRejectedValue(new Error('network'))
                await expect(store.getInvitations()).resolves.not.toThrow()
            })
        })

        describe('$reset', () => {
            it('restores default state', async () => {
                const store = useAccountStore()
                store.invitations = [{ id: 'inv-1' }]

                store.$reset()

                expect(store.invitations).toEqual([])
                expect(store.pendingTeamChange).toBe(false)
            })
        })
    })
})
