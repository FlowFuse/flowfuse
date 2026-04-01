import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/api/team.js', () => ({
    default: {
        getTeam: vi.fn(),
        getTeamUserMembership: vi.fn(),
        getTeams: vi.fn()
    }
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

vi.mock('@/stores/account-auth.js', () => ({
    useAccountAuthStore: () => ({ user: { id: 'u1', defaultTeam: 'team-1' } })
}))

// Shared mutable state used by the context store mock
const mockContext = {
    team: null,
    teamMembership: null,
    setTeam (team) { this.team = team },
    setTeamMembership (membership) { this.teamMembership = membership }
}

vi.mock('@/stores/context.js', () => ({
    useContextStore: () => mockContext
}))

// Imported after mocks so vi.mock hoisting resolves correctly
const { useAccountTeamStore } = await import('@/stores/account-team.js')
const teamApi = (await import('@/api/team.js')).default
const flowBlueprintsApi = (await import('@/api/flowBlueprints.js')).default
const userApi = (await import('@/api/user.js')).default
const product = (await import('@/services/product.js')).default

describe('account-team store', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        vi.clearAllMocks()
        // Reset shared context mock state
        mockContext.team = null
        mockContext.teamMembership = null
    })

    describe('initial state', () => {
        it('initializes with default state', () => {
            const store = useAccountTeamStore()
            expect(store.teams).toEqual([])
            expect(store.teamBlueprints).toEqual({})
            expect(store.pendingTeamChange).toBe(false)
            expect(store.notifications).toEqual([])
            expect(store.invitations).toEqual([])
        })
    })

    describe('getters', () => {
        describe('blueprints', () => {
            it('returns empty array when context team is null', () => {
                const store = useAccountTeamStore()
                expect(store.blueprints).toEqual([])
            })

            it('returns blueprints for the current team from context', () => {
                mockContext.team = { id: 'team-1' }
                const store = useAccountTeamStore()
                store.teamBlueprints = { 'team-1': [{ id: 'bp-1' }] }
                expect(store.blueprints).toEqual([{ id: 'bp-1' }])
            })

            it('returns empty array when no blueprints for current team', () => {
                mockContext.team = { id: 'team-1' }
                const store = useAccountTeamStore()
                store.teamBlueprints = {}
                expect(store.blueprints).toEqual([])
            })
        })

        describe('defaultBlueprint', () => {
            it('returns undefined when no blueprints', () => {
                const store = useAccountTeamStore()
                expect(store.defaultBlueprint).toBeUndefined()
            })

            it('returns the blueprint marked as default', () => {
                mockContext.team = { id: 'team-1' }
                const store = useAccountTeamStore()
                store.teamBlueprints = {
                    'team-1': [
                        { id: 'bp-1', default: false },
                        { id: 'bp-2', default: true }
                    ]
                }
                expect(store.defaultBlueprint).toEqual({ id: 'bp-2', default: true })
            })
        })

        describe('defaultUserTeam', () => {
            it('returns the team matching the user defaultTeam', () => {
                const store = useAccountTeamStore()
                const team1 = { id: 'team-1', name: 'Alpha' }
                const team2 = { id: 'team-2', name: 'Beta' }
                store.teams = [team1, team2]
                // mock returns user.defaultTeam = 'team-1'
                expect(store.defaultUserTeam).toEqual(team1)
            })

            it('falls back to undefined when no defaultTeam match', () => {
                const store = useAccountTeamStore()
                const team1 = { id: 'team-99', name: 'Other' }
                store.teams = [team1]
                // user.defaultTeam = 'team-1' but only 'team-99' exists
                expect(store.defaultUserTeam).toBeUndefined()
            })
        })

        describe('notificationsCount', () => {
            it('returns 0 when notifications is initial state', () => {
                const store = useAccountTeamStore()
                expect(store.notificationsCount).toBe(0)
            })

            it('returns the length of the notifications array', () => {
                const store = useAccountTeamStore()
                store.notifications = [{ id: 1 }, { id: 2 }]
                expect(store.notificationsCount).toBe(2)
            })
        })

        describe('unreadNotificationsCount', () => {
            it('returns 0 when no notifications', () => {
                const store = useAccountTeamStore()
                store.notifications = []
                expect(store.unreadNotificationsCount).toBe(0)
            })

            it('counts unread notifications', () => {
                const store = useAccountTeamStore()
                store.notifications = [
                    { id: 1, read: false, data: { meta: {} } },
                    { id: 2, read: true, data: { meta: {} } }
                ]
                expect(store.unreadNotificationsCount).toBe(1)
            })

            it('adds grouped notification counter values', () => {
                const store = useAccountTeamStore()
                store.notifications = [
                    { id: 1, read: false, data: { meta: { counter: 3 } } }
                ]
                // 1 (base) + (3 - 1) = 3
                expect(store.unreadNotificationsCount).toBe(3)
            })
        })

        describe('hasNotifications', () => {
            it('returns false when empty', () => {
                const store = useAccountTeamStore()
                store.notifications = []
                expect(store.hasNotifications).toBe(false)
            })

            it('returns true when there are notifications', () => {
                const store = useAccountTeamStore()
                store.notifications = [{ id: 1 }]
                expect(store.hasNotifications).toBe(true)
            })
        })

        describe('teamInvitations / teamInvitationsCount', () => {
            it('returns invitations array', () => {
                const store = useAccountTeamStore()
                store.invitations = [{ id: 'inv-1' }]
                expect(store.teamInvitations).toEqual([{ id: 'inv-1' }])
                expect(store.teamInvitationsCount).toBe(1)
            })
        })

        describe('hasAvailableTeams', () => {
            it('returns false when teams is empty', () => {
                const store = useAccountTeamStore()
                expect(store.hasAvailableTeams).toBe(false)
            })

            it('returns true when teams exist', () => {
                const store = useAccountTeamStore()
                store.teams = [{ id: 'team-1' }]
                expect(store.hasAvailableTeams).toBe(true)
            })
        })
    })

    describe('actions', () => {
        describe('setTeams', () => {
            it('replaces the teams array', () => {
                const store = useAccountTeamStore()
                const teams = [{ id: 'team-1' }, { id: 'team-2' }]
                store.setTeams(teams)
                expect(store.teams).toEqual(teams)
            })
        })

        describe('setTeam', () => {
            it('refreshes context membership but skips full reload when same team is already set (by id)', async () => {
                const store = useAccountTeamStore()
                const team = { id: 'team-1', slug: 'alpha' }
                const membership = { role: 50 }
                mockContext.team = team
                teamApi.getTeamUserMembership.mockResolvedValue(membership)

                await store.setTeam(team)

                expect(teamApi.getTeamUserMembership).toHaveBeenCalledWith(team.id)
                expect(mockContext.teamMembership).toEqual(membership)
                // team object itself should NOT be re-set (no product.setTeam call)
                expect(product.setTeam).not.toHaveBeenCalled()
            })

            it('does nothing if both current and new team are null', async () => {
                const store = useAccountTeamStore()
                await store.setTeam(null)
                expect(teamApi.getTeamUserMembership).not.toHaveBeenCalled()
            })

            it('sets team + membership on context and calls product.setTeam', async () => {
                const store = useAccountTeamStore()
                const team = { id: 'team-2', slug: 'beta' }
                const membership = { role: 50 }
                teamApi.getTeamUserMembership.mockResolvedValue(membership)

                await store.setTeam(team)

                expect(mockContext.team).toEqual(team)
                expect(mockContext.teamMembership).toEqual(membership)
                expect(product.setTeam).toHaveBeenCalledWith(team)
                expect(store.pendingTeamChange).toBe(false)
            })

            it('fetches team by slug when passed a string', async () => {
                const store = useAccountTeamStore()
                const fetchedTeam = { id: 'team-3', slug: 'gamma' }
                const membership = { role: 50 }
                teamApi.getTeam.mockResolvedValue(fetchedTeam)
                teamApi.getTeamUserMembership.mockResolvedValue(membership)

                await store.setTeam('gamma')

                expect(teamApi.getTeam).toHaveBeenCalledWith({ slug: 'gamma' })
                expect(mockContext.team).toEqual(fetchedTeam)
            })
        })

        describe('getTeamBlueprints', () => {
            it('fetches and stores blueprints for the given team', async () => {
                const store = useAccountTeamStore()
                const blueprints = [{ id: 'bp-1' }, { id: 'bp-2' }]
                flowBlueprintsApi.getFlowBlueprintsForTeam.mockResolvedValue({ blueprints })

                await store.getTeamBlueprints('team-1')

                expect(flowBlueprintsApi.getFlowBlueprintsForTeam).toHaveBeenCalledWith('team-1')
                expect(store.teamBlueprints['team-1']).toEqual(blueprints)
            })
        })

        describe('getNotifications', () => {
            it('sets notifications from API response', async () => {
                const store = useAccountTeamStore()
                const notifications = [{ id: 'n1' }, { id: 'n2' }]
                userApi.getNotifications.mockResolvedValue({ notifications })

                await store.getNotifications()

                expect(store.notifications).toEqual(notifications)
            })

            it('sets notifications to empty array when API returns no notifications key', async () => {
                const store = useAccountTeamStore()
                userApi.getNotifications.mockResolvedValue({})

                await store.getNotifications()

                expect(store.notifications).toEqual([])
            })

            it('does not throw on API failure', async () => {
                const store = useAccountTeamStore()
                userApi.getNotifications.mockRejectedValue(new Error('network'))
                await expect(store.getNotifications()).resolves.not.toThrow()
            })
        })

        describe('setNotifications', () => {
            it('directly sets notifications', () => {
                const store = useAccountTeamStore()
                const notifications = [{ id: 'n1' }]
                store.setNotifications(notifications)
                expect(store.notifications).toEqual(notifications)
            })
        })

        describe('getInvitations', () => {
            it('sets invitations from API response', async () => {
                const store = useAccountTeamStore()
                const invitations = [{ id: 'inv-1' }]
                userApi.getTeamInvitations.mockResolvedValue({ invitations })

                await store.getInvitations()

                expect(store.invitations).toEqual(invitations)
            })

            it('does not throw on API failure', async () => {
                const store = useAccountTeamStore()
                userApi.getTeamInvitations.mockRejectedValue(new Error('network'))
                await expect(store.getInvitations()).resolves.not.toThrow()
            })
        })

        describe('$reset', () => {
            it('restores default state', async () => {
                const store = useAccountTeamStore()
                store.teams = [{ id: 'team-1' }]
                store.invitations = [{ id: 'inv-1' }]

                store.$reset()

                expect(store.teams).toEqual([])
                expect(store.invitations).toEqual([])
                expect(store.pendingTeamChange).toBe(false)
            })
        })
    })
})
