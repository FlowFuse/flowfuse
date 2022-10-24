import client from './client'
import daysSince from '@/utils/daysSince'
import elapsedTime from '@/utils/elapsedTime'
import paginateUrl from '@/utils/paginateUrl'
import { RoleNames, Roles } from '@core/lib/roles'

const getTeams = () => {
    return client.get('/api/v1/user/teams').then(res => {
        res.data.teams = res.data.teams.map(r => {
            r.link = { name: 'Team', params: { team_slug: r.slug } }
            r.roleName = RoleNames[r.role]
            return r
        })
        return res.data
    })
}

const getTeam = (team) => {
    let url
    if (typeof team === 'object') {
        url = `/api/v1/teams/?slug=${team.slug}`
    } else {
        url = `/api/v1/teams/${team}`
    }
    return client.get(url).then(res => res.data)
}

const deleteTeam = async (teamId) => {
    return await client.delete(`/api/v1/teams/${teamId}`)
}

const getTeamProjects = async (teamId) => {
    const res = await client.get(`/api/v1/teams/${teamId}/projects`)
    const promises = []
    res.data.projects = res.data.projects.map(r => {
        r.createdSince = daysSince(r.createdAt)
        r.updatedSince = daysSince(r.updatedAt)
        r.link = { name: 'Project', params: { id: r.id } }
        promises.push(client.get(`/api/v1/projects/${r.id}`).then(p => {
            r.status = p.data.meta.state
        }).catch(err => {
            console.log('not found', err)
            r.status = 'stopped'
        }))

        return r
    })
    await Promise.all(promises)
    return res.data
}

const getTeamMembers = (teamId) => {
    return client.get(`/api/v1/teams/${teamId}/members`).then(res => {
        return res.data
    })
}

const getTeamInvitations = (teamId) => {
    return client.get(`/api/v1/teams/${teamId}/invitations`).then(res => {
        res.data.invitations = res.data.invitations.map(r => {
            r.roleName = RoleNames[r.role || Roles.Member]
            r.createdSince = daysSince(r.createdAt)
            r.expires = elapsedTime(r.expiresAt, Date.now())
            return r
        })
        return res.data
    })
}
const createTeamInvitation = (teamId, userDetails, role) => {
    const opts = {
        user: userDetails,
        role
    }
    return client.post(`/api/v1/teams/${teamId}/invitations`, opts).then(res => {
        return res.data
    })
}
const removeTeamInvitation = (teamId, inviteId) => {
    return client.delete(`/api/v1/teams/${teamId}/invitations/${inviteId}`)
}

const create = async (options) => {
    return client.post('/api/v1/teams/', options).then(res => {
        return res.data
    })
}

const changeTeamMemberRole = (teamId, userId, role) => {
    const opts = {
        role
    }
    return client.put(`/api/v1/teams/${teamId}/members/${userId}`, opts)
}

const removeTeamMember = (teamId, userId) => {
    return client.delete(`/api/v1/teams/${teamId}/members/${userId}`)
}

const getTeamAuditLog = async (teamId, cursor, limit) => {
    const url = paginateUrl(`/api/v1/teams/${teamId}/audit-log`, cursor, limit)
    return client.get(url).then(res => res.data)
}
const getTeamUserMembership = (teamId) => {
    return client.get(`/api/v1/teams/${teamId}/user`).then(res => res.data)
}
const updateTeam = async (teamId, options) => {
    return client.put(`/api/v1/teams/${teamId}`, options).then(res => {
        return res.data
    })
}

const getTeamDevices = async (teamId, cursor, limit) => {
    const url = paginateUrl(`/api/v1/teams/${teamId}/devices`, cursor, limit)
    const res = await client.get(url)
    res.data.devices.forEach(device => {
        device.lastSeenSince = device.lastSeenAt ? daysSince(device.lastSeenAt) : ''
    })
    return res.data
}

/**
 * Calls api routes in team.js
 * See [routes/api/team.js](../../../forge/routes/api/team.js)
*/
export default {
    create,
    getTeam,
    deleteTeam,
    updateTeam,
    getTeams,
    getTeamProjects,
    getTeamMembers,
    changeTeamMemberRole,
    removeTeamMember,
    getTeamInvitations,
    createTeamInvitation,
    removeTeamInvitation,
    getTeamAuditLog,
    getTeamUserMembership,
    getTeamDevices
}
