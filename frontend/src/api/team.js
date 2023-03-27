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

/**
 * Get a list of projects for a team.
 * The status of each project will be added to the project object.
 * @param {string} teamId The Team ID (hash) to get projects for
 */
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

/**
 * Get a list of projects (names & id  only)
 * This function does not get project status
 * @param {string} teamId The Team ID (hash) to get projects for
 * @see getTeamProjects
 * @returns {[{id: string, name: string}]} An array of project objects containing name and id
 */
const getTeamProjectList = async (teamId) => {
    const res = await client.get(`/api/v1/teams/${teamId}/projects`)
    const list = res.data.projects.map(r => {
        return {
            id: r.id,
            name: r.name
        }
    })
    return list
}

/**
 * Get a list of applications
 * This function does not get project status
 * @param {string} teamId The Team ID (hash) to get projects for
 * @returns An array of application objects
 */
const getTeamApplications = async (teamId) => {
    const result = await client.get(`/api/v1/teams/${teamId}/applications`)
    return result.data
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

const getTeamAuditLog = async (teamId, params, cursor, limit) => {
    const url = paginateUrl(`/api/v1/teams/${teamId}/audit-log`, cursor, limit)
    return client.get(url, { params }).then(res => res.data)
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

        // TODO: Remove this temporary copy of application over instance
        if (device.project) {
            device.instance = device.project
        }
    })
    return res.data
}

const getTeamLibrary = async (teamId, parentDir, cursor, limit) => {
    const url = paginateUrl(`/storage/library/${teamId}/${parentDir || ''}`, cursor, limit)
    const res = await client.get(url)
    return res.data
}

/**
 *
 * @param {*} teamId Team ID (hash)
 * @param {*} name Name of file to delete
 * @param {*} type File type e.g. flows/functions filter
 */
const deleteFromTeamLibrary = async (teamId, name, type = null) => {
    let query = ''
    if (type) {
        query = `?type=${type}`
    }

    return await client.delete(`/storage/library/${teamId}/${name}${query}`)
}

/**
 *
 * @param {string} teamId Team ID (hash)
 * @param {*} cursor The next page cursor (not implemented)
 * @param {number} limit The number of results to return (not implemented)
 * @returns { meta: { next_cursor }, tokens: [ { } ] }
 */
const getTeamDeviceProvisioningTokens = async (teamId, cursor, limit) => {
    const url = paginateUrl(`/api/v1/teams/${teamId}/devices/provisioning`, cursor, limit)
    const res = await client.get(url)
    return res.data
}

/**
 * Generate an auto provisioning token
 * @param {string} teamId The team ID (hash)
 * @param {object} options
 * @param {string} options.name The name of the token
 * @param {string} [options.project] The project ID (hash)
 * @param {string} [options.expiresAt] The expiry date of the token
 * @returns
 */
const generateTeamDeviceProvisioningToken = async (teamId, options) => {
    options = options || {}
    const { name, project, expiresAt } = options
    return client.post(`/api/v1/teams/${teamId}/devices/provisioning`,
        {
            name: name || 'Auto Provisioning Token',
            project,
            expiresAt
        }
    ).then(res => {
        return res.data
    })
}

/**
 * Update an auto provisioning token
 * @param {string} teamId The team ID (hash)
 * @param {string} tokenId The token ID (hash)
 * @param {object} options
 * @param {string} [options.project] The project ID (hash)
 * @param {string} [options.expiresAt] The expiry date of the token
 * @returns
 */
const updateTeamDeviceProvisioningToken = async (teamId, tokenId, options) => {
    options = options || {}
    const { project, expiresAt } = options
    return client.put(`/api/v1/teams/${teamId}/devices/provisioning/${tokenId}`,
        {
            project,
            expiresAt
        }
    ).then(res => {
        return res.data
    })
}

/**
 * Delete a provisioning token
 * @param {string} teamId The team ID (hash)
 * @param {string} tokenId The token ID (hash)
 * @returns
 */
const deleteTeamDeviceProvisioningToken = async (teamId, tokenId) => {
    return await client.delete(`/api/v1/teams/${teamId}/devices/provisioning/${tokenId}`)
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
    getTeamApplications,
    getTeamProjects,
    getTeamProjectList,
    getTeamMembers,
    changeTeamMemberRole,
    removeTeamMember,
    getTeamInvitations,
    createTeamInvitation,
    removeTeamInvitation,
    getTeamAuditLog,
    getTeamUserMembership,
    getTeamDevices,
    getTeamLibrary,
    deleteFromTeamLibrary,
    getTeamDeviceProvisioningTokens,
    generateTeamDeviceProvisioningToken,
    updateTeamDeviceProvisioningToken,
    deleteTeamDeviceProvisioningToken
}
