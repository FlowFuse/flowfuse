import product from '../services/product.js'

import daysSince from '../utils/daysSince.js'
import elapsedTime from '../utils/elapsedTime.js'
import paginateUrl from '../utils/paginateUrl.js'
import { RoleNames, Roles } from '../utils/roles.js'

import client from './client.js'

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
        url = `/api/v1/teams/slug/${team.slug}`
    } else {
        url = `/api/v1/teams/${team}`
    }
    return client.get(url).then((res) => {
        // ensure posthog Team is upt-o-date
        // this may be excessive to call _every_ get of the team,
        // but its a start, and will ensure up to date data
        const props = {
            'team-name': res.data.name,
            'created-at': res.data.createdAt,
            'count-applications': res.data.instanceCount,
            'count-instances': res.data.instanceCount,
            'count-members': res.data.memberCount
        }
        if ('billing' in res.data) {
            props['billing-active'] = res.data.billing.active
            props['billing-canceled'] = res.data.billing.canceled
            props['billing-unmanaged'] = res.data.billing.unmanaged

            if ('trial' in res.data.billing) {
                props['billing-trial'] = res.data.billing.trial
                props['billing-trial-ended'] = res.data.billing.trialEnded
                props['billing-trial-ends-at'] = res.data.billing.trialEndsAt
            }
        }
        product.groupUpdate('team', res.data.id, props)

        return res.data
    })
}

const deleteTeam = async (teamId) => {
    return await client.delete(`/api/v1/teams/${teamId}`).then(() => {
        const timestamp = (new Date()).toISOString()
        // capture deletion event
        product.capture('$ff-team-deleted', {
            'deleted-at': timestamp
        }, {
            team: teamId
        })
        // update the team "group"
        product.groupUpdate('team', teamId, {
            deleted: true,
            'deleted-at': timestamp
        })
    })
}

/**
 * Get a list of applications
 * This function does not get instance status
 * @param {string} teamId The Team ID (hash) to get applications and instances for
 * @param associationsLimit
 * @param includeApplicationSummary
 * @returns An array of application objects containing an array of instances
 */
const getTeamApplications = async (teamId, { associationsLimit, includeApplicationSummary = false } = {}) => {
    const options = { params: {} }
    if (associationsLimit) {
        options.params.associationsLimit = associationsLimit
    }
    if (includeApplicationSummary) {
        options.params.includeApplicationSummary = includeApplicationSummary
    }
    const result = await client.get(`/api/v1/teams/${teamId}/applications`, options)
    return result.data
}

/**
 * Get a list of applications, their instances, their devices, and the status of each
 * @param {string} teamId The Team ID (hash) to get statuses for
 * @returns An array of application ids containing an array of instance and device statuses
 */
const getTeamApplicationsAssociationsStatuses = async (teamId, { associationsLimit } = {}) => {
    const options = {}
    if (associationsLimit) {
        options.params = { associationsLimit }
    }
    const result = await client.get(`/api/v1/teams/${teamId}/applications/status`, options)

    result.data.applications.forEach((application) => {
        application.instances.forEach((instance) => {
            instance.flowLastUpdatedSince = daysSince(instance.flowLastUpdatedAt)
        })
    })

    return result.data
}

/**
 * Get a list of ALL instances within a team regardless of application
 * The status of each instance will be added to the instance object.
 * @param {string} teamId The Team ID (hash) to get instances for
 * @deprecated This is a leftover from before the application model was introduced
 */
const getTeamInstances = async (teamId) => {
    const res = await client.get(`/api/v1/teams/${teamId}/projects`)
    const promises = []
    res.data.projects = res.data.projects.map(r => {
        r.createdSince = daysSince(r.createdAt)
        r.updatedSince = daysSince(r.updatedAt)
        r.link = { name: 'Application', params: { id: r.id } }
        promises.push(client.get(`/api/v1/projects/${r.id}`).then(p => {
            r.status = p.data.meta.state
            r.flowLastUpdatedAt = p.data.flowLastUpdatedAt
            r.flowLastUpdatedSince = daysSince(r.flowLastUpdatedAt)
        }).catch(err => {
            console.error('not found', err)
            r.status = 'stopped'
        }))

        return r
    })
    await Promise.all(promises)
    return res.data
}

const getTeamDashboards = async (teamId) => {
    const res = await client.get(`/api/v1/teams/${teamId}/dashboard-instances`)
    res.data.projects = res.data.projects.map(r => {
        r.createdSince = daysSince(r.createdAt)
        r.updatedSince = daysSince(r.updatedAt)
        r.flowLastUpdatedSince = daysSince(r.flowLastUpdatedAt)

        r.link = { name: 'Application', params: { id: r.id } }

        return r
    })
    return res.data
}

/**
 * Get a the name and id of of ALL instances within a team regardless of application
 * This function does not include instance status
 * @param {string} teamId The Team ID (hash) to get instance for
 * @see getTeamInstances
 * @returns {[{id: string, name: string, application: {id: string, name: string}}]} An array of objects containing instance summary
 * @deprecated This is a leftover from before the application model was introduced
 */
const getTeamInstancesList = async (teamId) => {
    const res = await client.get(`/api/v1/teams/${teamId}/projects`)
    const list = res.data.projects.map(r => {
        return {
            id: r.id,
            name: r.name,
            application: {
                id: r.application.id,
                name: r.application.name
            }
        }
    })
    return list
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
        product.capture('$ff-invite-sent', {
            'invite-sent-to': userDetails,
            'invite-role-assigned': role
        }, {
            team: teamId
        })
        return res.data
    })
}
const removeTeamInvitation = (teamId, inviteId) => {
    return client.delete(`/api/v1/teams/${teamId}/invitations/${inviteId}`).then(() => {
        product.capture('$ff-invite-removed', {
            'invite-id': inviteId
        }, {
            team: teamId
        })
    })
}
const resendTeamInvitation = (teamId, inviteId) => {
    return client.post(`/api/v1/teams/${teamId}/invitations/${inviteId}`)
        .then((response) => response.data)
        .then((invitation) => {
            product.capture('$ff-invite-resent', {
                'invite-id': inviteId
            }, {
                team: teamId
            })

            invitation.roleName = RoleNames[invitation.role || Roles.Member]
            invitation.createdSince = daysSince(invitation.createdAt)
            invitation.expires = elapsedTime(invitation.expiresAt, Date.now())

            return invitation
        })
}

const create = async (options) => {
    return client.post('/api/v1/teams/', options).then(res => {
        // PostHog Event & Group Capture
        product.capture('$ff-team-created', {
            'team-name': options.name,
            'team-type-id': options.type,
            'created-at': res.data.createdAt
        }, {
            team: res.data.id
        })
        const props = {
            'team-name': options.name,
            'team-type-id': options.type,
            'created-at': res.data.createdAt,
            'count-applications': 0,
            'count-instances': 0,
            'count-devices': 0,
            'count-members': res.data.memberCount
        }
        product.groupUpdate('team', res.data.id, props)
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
    return client.delete(`/api/v1/teams/${teamId}/members/${userId}`).then(() => {
        product.capture('$ff-team-member-removed', {
            'member-removed': userId,
            'removed-at': (new Date()).toISOString()
        }, {
            team: teamId
        })
    })
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

const getTeamDevices = async (teamId, cursor, limit, query, extraParams = {}) => {
    const url = paginateUrl(`/api/v1/teams/${teamId}/devices`, cursor, limit, query, extraParams)
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

const getTeamRegistry = async (teamId, cursor, limit) => {
    const url = paginateUrl(`/api/v1/teams/${teamId}/npm/packages`, cursor, limit)
    const res = await client.get(url)
    return {
        data: res.data
    }
}
const generateRegistryUserToken = async (teamId) => {
    const url = paginateUrl(`/api/v1/teams/${teamId}/npm/userToken`)
    const res = await client.post(url)
    return {
        data: res.data
    }
}

const getTeamLibrary = async (teamId, parentDir, cursor, limit) => {
    const url = paginateUrl(`/storage/library/${teamId}/${parentDir || ''}`, cursor, limit)
    const res = await client.get(url)
    const meta = {}
    // get meta.type from `x-meta-type` header
    meta.type = res.headers['x-meta-type']
    return {
        meta,
        data: res.data
    }
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
    const { name, application, instance, expiresAt } = options
    return client.post(`/api/v1/teams/${teamId}/devices/provisioning`,
        {
            name: name || 'Auto Provisioning Token',
            application,
            instance,
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
 * @param {string} [options.instance] The instance ID (hash)
 * @param {string} [options.expiresAt] The expiry date of the token
 * @returns
 */
const updateTeamDeviceProvisioningToken = async (teamId, tokenId, options) => {
    options = options || {}
    const { application, instance, expiresAt } = options
    return client.put(`/api/v1/teams/${teamId}/devices/provisioning/${tokenId}`,
        {
            application,
            instance,
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
 * Bulk delete devices
 * @param {string} teamId - Team ID (hash)
 * @param {Array<string>} devices - Array of device IDs (hash)
 * @returns
 */
const bulkDeviceDelete = async (teamId, devices) => {
    return await client.delete(`/api/v1/teams/${teamId}/devices/bulk`, { data: { devices } })
}

/**
 * Bulk move devices
 * @param {string} teamId - Team ID (hash)
 * @param {Array<string>} devices - Array of device IDs (hash)
 * @param {object} options
 * @param {'instance' | 'application' | 'unassigned'} options.moveTo - Destination to move devices to. Can be 'instance', 'application', or 'unassigned'
 * @param {string} [options.id] - ID (hash) of the destination
 * @returns
 */
const bulkDeviceMove = async (teamId, devices, moveTo, id = undefined) => {
    const url = `/api/v1/teams/${teamId}/devices/bulk`
    const data = { devices }
    if (moveTo === 'instance') {
        data.instance = id
    } else if (moveTo === 'application') {
        data.application = id
    } else if (moveTo === 'unassigned') {
        data.instance = null
        data.application = null
    } else {
        throw new Error('Invalid destination')
    }
    const res = await client.put(url, data)
    res.data.devices.forEach(device => {
        device.lastSeenSince = device.lastSeenAt ? daysSince(device.lastSeenAt) : ''
        if (device.project) {
            device.instance = device.project
        }
    })
    return res.data
}

/**
 * Get a list of Dependencies / Bill of Materials
 * @param teamId
 * @returns {Promise<axios.AxiosResponse<any>>}
 */
const getDependencies = (teamId) => {
    return client.get(`/api/v1/teams/${teamId}/bom`)
        .then(res => res.data)
}

const getTeamDeviceGroups = (teamId) => {
    return client.get(`/api/v1/teams/${teamId}/device-groups`)
        .then(res => res.data)
}

const getGitTokens = async (teamId, cursor) => {
    const url = paginateUrl(`/api/v1/teams/${teamId}/git/tokens`, cursor)
    return client.get(url).then(res => res.data)
}

const createGitToken = async (teamId, token) => {
    return client.post(`/api/v1/teams/${teamId}/git/tokens`, token).then(res => res.data)
}
const deleteGitToken = async (teamId, tokenId) => {
    return client.delete(`/api/v1/teams/${teamId}/git/tokens/${tokenId}`)
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
    getTeamApplicationsAssociationsStatuses,
    getTeamInstances,
    getTeamInstancesList,
    getTeamDashboards,
    getTeamMembers,
    changeTeamMemberRole,
    removeTeamMember,
    getTeamInvitations,
    createTeamInvitation,
    removeTeamInvitation,
    resendTeamInvitation,
    getTeamAuditLog,
    getTeamUserMembership,
    getTeamDevices,
    getTeamRegistry,
    generateRegistryUserToken,
    getTeamLibrary,
    deleteFromTeamLibrary,
    getTeamDeviceProvisioningTokens,
    generateTeamDeviceProvisioningToken,
    updateTeamDeviceProvisioningToken,
    deleteTeamDeviceProvisioningToken,
    bulkDeviceDelete,
    bulkDeviceMove,
    getDependencies,
    getTeamDeviceGroups,
    getGitTokens,
    createGitToken,
    deleteGitToken
}
