import { expect, vi } from 'vitest'

/*
    Mock Values & Imports
*/
const mockGet = vi.fn().mockImplementation().mockReturnValue(Promise.resolve({
    data: {
        teams: [],
        devices: []
    }
}))
const mockPost = vi.fn().mockImplementation().mockReturnValue(Promise.resolve({ data: {} }))
const mockPut = vi.fn().mockImplementation().mockReturnValue(Promise.resolve({ data: {} }))
const mockDelete = vi.fn().mockImplementation().mockReturnValue(Promise.resolve({ data: {} }))

vi.mock('@/api/client', () => {
    return {
        default: {
            get: mockGet,
            post: mockPost,
            put: mockPut,
            delete: mockDelete
        }
    }
})

const roles = require('../../../../forge/lib/roles')
vi.mock('@core/lib/roles', () => {
    return roles
})

const mockPaginateUrl = vi.fn().mockImplementation().mockReturnValue('<paginated-url>')

vi.mock('@/utils/paginateUrl', () => {
    return {
        default: mockPaginateUrl
    }
})

const mockDaysSince = vi.fn().mockImplementation().mockReturnValue('<days-since>')

vi.mock('@/utils/daysSince', () => {
    return {
        default: mockDaysSince
    }
})

const mockElapsedTime = vi.fn().mockImplementation().mockReturnValue('<elapsed-time>')

vi.mock('@/utils/elapsedTime', () => {
    return {
        default: mockElapsedTime
    }
})

/*
    Tests
*/
describe('Team API', async () => {
    const TeamAPI = await import('@/api/team')

    afterEach(() => {
        mockGet.mockClear()
        mockPost.mockClear()
        mockPut.mockClear()
        mockDelete.mockClear()
        mockPaginateUrl.mockClear()
    })

    test('getTeam calls the correct API endpoint when provided an object', () => {
        const teamslug = 'teamslug'
        TeamAPI.default.getTeam({ slug: teamslug })
        expect(mockGet).toHaveBeenCalledOnce()
        expect(mockGet).toHaveBeenCalledWith('/api/v1/teams/?slug=' + teamslug)
    })

    test('getTeam calls the correct API endpoint when provided a string', () => {
        const teamslug = 'teamslug'
        TeamAPI.default.getTeam(teamslug)
        expect(mockGet).toHaveBeenCalledOnce()
        expect(mockGet).toHaveBeenCalledWith('/api/v1/teams/' + teamslug)
    })

    test('getTeams calls the correct API endpoint', () => {
        TeamAPI.default.getTeams()
        expect(mockGet).toHaveBeenCalledOnce()
        expect(mockGet).toHaveBeenCalledWith('/api/v1/user/teams')
    })

    test('getTeams add link and roleName information to the API response', async () => {
        mockGet.mockReturnValueOnce(Promise.resolve({
            data: {
                teams: [{
                    role: 30,
                    slug: 'team_slug'
                }]
            }
        }))
        const response = await TeamAPI.default.getTeams()
        expect(response.teams[0].link).toEqual({
            name: 'Team',
            params: {
                team_slug: 'team_slug'
            }
        })
        expect(response.teams[0].roleName).toEqual('member')
    })

    test('create calls the correct API endpoint, with the relevant options', () => {
        const options = {
            mock: 'options'
        }
        TeamAPI.default.create(options)
        expect(mockPost).toHaveBeenCalledOnce()
        expect(mockPost).toHaveBeenCalledWith('/api/v1/teams/', options)
    })

    test('updateTeam calls the correct API endpoint', () => {
        const options = {
            mock: 'options'
        }
        const teamid = 'teamid'
        TeamAPI.default.updateTeam(teamid, options)
        expect(mockPut).toHaveBeenCalledOnce()
        expect(mockPut).toHaveBeenCalledWith('/api/v1/teams/' + teamid, options)
    })

    test('deleteTeam calls the correct API endpoint', () => {
        const teamid = 'teamid'
        TeamAPI.default.deleteTeam(teamid)
        expect(mockDelete).toHaveBeenCalledOnce()
        expect(mockDelete).toHaveBeenCalledWith('/api/v1/teams/' + teamid)
    })

    /* Invitations */

    test('getTeamInvitations calls the correct API endpoint', () => {
        mockGet.mockReturnValueOnce(Promise.resolve({
            data: {
                invitations: [{}]
            }
        }))
        const teamid = 'teamid'
        TeamAPI.default.getTeamInvitations(teamid)
        expect(mockGet).toHaveBeenCalledOnce()
        expect(mockGet).toHaveBeenCalledWith('/api/v1/teams/' + teamid + '/invitations')
    })

    test('createTeamInvitations calls the correct API endpoint & passes the relevant options', () => {
        const userdetails = {
            mock: 'userdetails'
        }
        const teamid = 'teamid'
        TeamAPI.default.createTeamInvitation(teamid, userdetails)
        expect(mockPost).toHaveBeenCalledOnce()
        expect(mockPost).toHaveBeenCalledWith('/api/v1/teams/' + teamid + '/invitations', {
            user: userdetails
        })
    })

    test('removeTeamInvitations calls the correct API endpoint', () => {
        const teamid = 'teamid'
        const inviteid = 'teamid'
        TeamAPI.default.removeTeamInvitation(teamid, inviteid)
        expect(mockDelete).toHaveBeenCalledOnce()
        expect(mockDelete).toHaveBeenCalledWith('/api/v1/teams/' + teamid + '/invitations/' + inviteid)
    })

    /* Audit Log */

    test('getTeamAuditLog calls the correct API endpoint', () => {
        const teamid = 'teamid'
        const cursor = 10
        const limit = 5
        TeamAPI.default.getTeamAuditLog(teamid, cursor, limit)
        expect(mockPaginateUrl).toHaveBeenCalledOnce()
        expect(mockPaginateUrl).toHaveBeenCalledWith(`/api/v1/teams/${teamid}/audit-log`, cursor, limit)
    })

    /* Team Members */

    test('getTeamMembers calls the correct API endpoint', () => {
        const teamid = 'teamid'
        TeamAPI.default.getTeamMembers(teamid)
        expect(mockGet).toHaveBeenCalledOnce()
        expect(mockGet).toHaveBeenCalledWith('/api/v1/teams/' + teamid + '/members')
    })

    test('getTeamUserMembership calls the correct API endpoint', () => {
        const teamid = 'teamid'
        TeamAPI.default.getTeamUserMembership(teamid)
        expect(mockGet).toHaveBeenCalledOnce()
        expect(mockGet).toHaveBeenCalledWith('/api/v1/teams/' + teamid + '/user')
    })

    test('changeTeamMemberRole calls the correct API endpoint', () => {
        const teamid = 'teamid'
        const userid = 'userid'
        const role = 'member'
        TeamAPI.default.changeTeamMemberRole(teamid, userid, role)
        expect(mockPut).toHaveBeenCalledOnce()
        expect(mockPut).toHaveBeenCalledWith('/api/v1/teams/' + teamid + '/members/' + userid, {
            role
        })
    })

    test('removeTeamMember calls the correct API endpoint', () => {
        const teamid = 'teamid'
        const userid = 'userid'
        TeamAPI.default.removeTeamMember(teamid, userid)
        expect(mockDelete).toHaveBeenCalledOnce()
        expect(mockDelete).toHaveBeenCalledWith('/api/v1/teams/' + teamid + '/members/' + userid)
    })

    /* Devices */

    test('getTeamDevices supports pagination options', () => {
        const teamid = 'teamid'
        const cursor = 10
        const limit = 5
        TeamAPI.default.getTeamDevices(teamid, cursor, limit)
        expect(mockPaginateUrl).toHaveBeenCalledOnce()
        expect(mockPaginateUrl).toHaveBeenCalledWith('/api/v1/teams/' + teamid + '/devices', cursor, limit)
        expect(mockGet).toHaveBeenCalledOnce()
        expect(mockGet).toHaveBeenCalledWith('<paginated-url>')
    })
})
