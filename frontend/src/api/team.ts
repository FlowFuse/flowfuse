import type { Team, Application, Device } from '@/types'

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

// Accepts a slug/id string OR a full Team object — TypeScript enforces the union
const getTeam = (team: string | Team): Promise<Team> => {
    let url
    if (typeof team === 'object') {
        url = `/api/v1/teams/slug/${team.slug}`
    } else {
        url = `/api/v1/teams/${team}`
    }
    return client.get(url).then((res) => {
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

const deleteTeam = async (teamId: string) => {
    return await client.delete(`/api/v1/teams/${teamId}`).then(() => {
        const timestamp = (new Date()).toISOString()
        product.capture('$ff-team-deleted', {
            'deleted-at': timestamp
        }, {
            team: teamId
        })
        product.groupUpdate('team', teamId, {
            deleted: true,
            'deleted-at': timestamp
        })
    })
}

/**
 * Get a list of applications
 * This function does not get instance status
 * @param teamId The Team ID (hash) to get applications for
 */
const getTeamApplications = async (teamId: string, {
    associationsLimit,
    includeApplicationSummary = false,
    includeInstances = undefined,
    includeApplicationDevices = undefined,
    excludeOwnerFiltering = undefined
}: {
    associationsLimit?: number
    includeApplicationSummary?: boolean
    includeInstances?: boolean
    includeApplicationDevices?: boolean
    excludeOwnerFiltering?: boolean
} = {}): Promise<{ applications: Application[], count: number }> => {
    const options: any = { params: {} }
    if (associationsLimit) {
        options.params.associationsLimit = associationsLimit
    }
    if (includeApplicationSummary) {
        options.params.includeApplicationSummary = includeApplicationSummary
    }
    if (includeInstances !== undefined) {
        options.params.includeInstances = includeInstances
    }
    if (includeApplicationDevices !== undefined) {
        options.params.includeApplicationDevices = includeApplicationDevices
    }
    if (excludeOwnerFiltering !== undefined) {
        options.params.excludeOwnerFiltering = excludeOwnerFiltering
    }

    const result = await client.get(`/api/v1/teams/${teamId}/applications`, options)
    return result.data
}

// NOLEY DEMO

// Part 1: Have claude generate a .ts file 
// Convert frontend/src/api/devices.js to TypeScript in a new file in the same folder. 
// Use these interfaces where appropriate: types/index.ts. Add return types to all exported functions.

// Part 2: Look how pretty this is 
// 1. Return types 
// 2. Param types with safety
// 3. Autocomplete

// const result = await getTeamApplications('123')
// const thingIWant = result.applications[0].unicorns


/**
 * Get a list of applications, their instances, their devices, and the status of each
 * @param teamId The Team ID (hash) to get statuses for
 */
const getTeamApplicationsAssociationsStatuses = async (teamId: string, { associationsLimit }: { associationsLimit?: number } = {}) => {
    const options: any = {}
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
 * @deprecated This is a leftover from before the application model was introduced
 */
const getTeamInstances = async (teamId: string) => {
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

const getTeamDashboards = async (teamId: string) => {
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
 * @deprecated This is a leftover from before the application model was introduced
 */
const getTeamInstancesList = async (teamId: string) => {
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

const getInstances = async (teamId: string, {
    limit = 20,
    includeMeta = false,
    orderByMostRecentFlows = false
} = {}) => {
    const params = new URLSearchParams()

    params.append('limit', limit.toString())

    if (includeMeta) params.append('includeMeta', includeMeta.toString())
    if (orderByMostRecentFlows) params.append('orderByMostRecentFlows', orderByMostRecentFlows.toString())

    return await client.get(`/api/v1/teams/${teamId}/projects?${params.toString()}`)
        .then(res => res.data)
}

const getTeamMembers = (teamId: string) => {
    return client.get(`/api/v1/teams/${teamId}/members`).then(res => {
        return res.data
    })
}

const getTeamInvitations = (teamId: string) => {
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

const createTeamInvitation = (teamId: string, userDetails, role) => {
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

const removeTeamInvitation = (teamId: string, inviteId: string) => {
    return client.delete(`/api/v1/teams/${teamId}/invitations/${inviteId}`).then(() => {
        product.capture('$ff-invite-removed', {
            'invite-id': inviteId
        }, {
            team: teamId
        })
    })
}

const resendTeamInvitation = (teamId: string, inviteId: string) => {
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

const changeTeamMemberRole = (teamId: string, userId: string, role = null, permissions = null) => {
    const opts: any = {}
    if (role) {
        opts.role = role
    }
    if (permissions) {
        opts.permissions = permissions
    }
    return client.put(`/api/v1/teams/${teamId}/members/${userId}`, opts)
}

const removeTeamMember = (teamId: string, userId: string) => {
    return client.delete(`/api/v1/teams/${teamId}/members/${userId}`).then(() => {
        product.capture('$ff-team-member-removed', {
            'member-removed': userId,
            'removed-at': (new Date()).toISOString()
        }, {
            team: teamId
        })
    })
}

const getTeamAuditLog = async (teamId: string, params, cursor, limit) => {
    const url = paginateUrl(`/api/v1/teams/${teamId}/audit-log`, cursor, limit)
    return client.get(url, { params }).then(res => res.data)
}

const getTeamUserMembership = (teamId: string) => {
    return client.get(`/api/v1/teams/${teamId}/user`).then(res => res.data)
}

const updateTeam = async (teamId: string, options) => {
    return client.put(`/api/v1/teams/${teamId}`, options).then(res => {
        return res.data
    })
}

const getTeamDevices = async (teamId: string, cursor, limit, query, extraParams = {}): Promise<{ devices: Device[], count: number, meta: { next_cursor?: string } }> => {
    const url = paginateUrl(`/api/v1/teams/${teamId}/devices`, cursor, limit, query, extraParams)
    const res = await client.get(url)
    res.data.devices.forEach(device => {
        device.lastSeenSince = device.lastSeenAt ? daysSince(device.lastSeenAt) : ''

        if (device.project) {
            device.instance = device.project
        }
    })
    return res.data
}

const getTeamRegistry = async (teamId: string, cursor, limit) => {
    const url = paginateUrl(`/api/v1/teams/${teamId}/npm/packages`, cursor, limit)
    const res = await client.get(url)
    return {
        data: res.data
    }
}

const generateRegistryUserToken = async (teamId: string) => {
    const url = paginateUrl(`/api/v1/teams/${teamId}/npm/userToken`)
    const res = await client.post(url)
    return {
        data: res.data
    }
}

const getTeamLibrary = async (teamId: string, parentDir, cursor, limit) => {
    const url = paginateUrl(`/storage/library/${teamId}/${parentDir || ''}`, cursor, limit)
    const res = await client.get(url)
    const meta: any = {}
    meta.type = res.headers['x-meta-type']
    return {
        meta,
        data: res.data
    }
}

const deleteFromTeamLibrary = async (teamId: string, name: string, type: string | null = null) => {
    let query = ''
    if (type) {
        query = `?type=${type}`
    }
    return await client.delete(`/storage/library/${teamId}/${name}${query}`)
}

const getTeamDeviceProvisioningTokens = async (teamId: string, cursor, limit) => {
    const url = paginateUrl(`/api/v1/teams/${teamId}/devices/provisioning`, cursor, limit)
    const res = await client.get(url)
    return res.data
}

const generateTeamDeviceProvisioningToken = async (teamId: string, options) => {
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

const updateTeamDeviceProvisioningToken = async (teamId: string, tokenId: string, options) => {
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

const deleteTeamDeviceProvisioningToken = async (teamId: string, tokenId: string) => {
    return await client.delete(`/api/v1/teams/${teamId}/devices/provisioning/${tokenId}`)
}

const bulkDeviceDelete = async (teamId: string, devices: string[]) => {
    return await client.delete(`/api/v1/teams/${teamId}/devices/bulk`, { data: { devices } })
}


const bulkDeviceMove = async (
    teamId: string,
    devices: string[],
    moveTo: 'instance' | 'application' | 'unassigned' | 'group',
    id: string | undefined = undefined
) => {
    const url = `/api/v1/teams/${teamId}/devices/bulk`
    const data: any = { devices }
    if (moveTo === 'instance') {
        data.instance = id
    } else if (moveTo === 'application') {
        data.application = id
    } else if (moveTo === 'unassigned') {
        data.instance = null
        data.application = null
    } else if (moveTo === 'group') {
        data.deviceGroup = id
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


const getDependencies = (teamId: string) => {
    return client.get(`/api/v1/teams/${teamId}/bom`)
        .then(res => res.data)
}

const getTeamDeviceGroups = (teamId: string) => {
    return client.get(`/api/v1/teams/${teamId}/device-groups`)
        .then(res => res.data)
}

const getGitTokens = async (teamId: string, cursor?) => {
    const url = paginateUrl(`/api/v1/teams/${teamId}/git/tokens`, cursor)
    return client.get(url).then(res => res.data)
}

const createGitToken = async (teamId: string, token) => {
    return client.post(`/api/v1/teams/${teamId}/git/tokens`, token).then(res => res.data)
}

const deleteGitToken = async (teamId: string, tokenId: string) => {
    return client.delete(`/api/v1/teams/${teamId}/git/tokens/${tokenId}`)
}

const getTeamInstanceCounts = async (teamId: string, states: string[], type: string, applicationId: string | null = null) => {
    const params = new URLSearchParams()
    states.forEach(state => params.append('state', state))
    params.append('instanceType', type)
    if (applicationId !== null) {
        params.append('applicationId', applicationId)
    }

    return client.get(`/api/v1/teams/${teamId}/instance-counts?${params.toString()}`)
        .then(res => res.data)
}

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
    getInstances,
    getTeamDashboards,
    getTeamMembers,
    getTeamInstanceCounts,
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
