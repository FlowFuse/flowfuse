import product from '../services/product'

import daysSince from '../utils/daysSince'
import elapsedTime from '../utils/elapsedTime'
import paginateUrl from '../utils/paginateUrl'
import { roleLabel } from '../utils/roleLabels.js'
import { RoleNames, Roles } from '../utils/roles'

import client from './client'

import type {
    AuditLogEntry,
    DeviceSummary,
    Invitation,
    InvitationList,
    Team,
    TeamSummary,
    UserTeamList
} from '@/types'

type RouterLink = { name: string, params: Record<string, string> }

type TeamListItem = UserTeamList[number] & { link: RouterLink, roleName: string, roleLabel: string }

type InvitationView = Invitation & { roleName: string, roleLabel: string, createdSince: string, expires: string }

type DeviceView = DeviceSummary & { lastSeenSince: string, instance?: DeviceSummary['application'] }

const getTeams = async (): Promise<{ teams: TeamListItem[] }> => {
    const res = await client.get<{ teams: UserTeamList }>('/api/v1/user/teams')
    const teams = res.data.teams.map((r): TeamListItem => ({
        ...r,
        link: { name: 'team', params: { team_slug: r.slug } },
        roleName: RoleNames[r.role],
        roleLabel: roleLabel(r.role)
    }))
    return { ...res.data, teams }
}

const getTeam = async (team: string | { slug: string }): Promise<Team | TeamSummary> => {
    const url = typeof team === 'object'
        ? `/api/v1/teams/slug/${team.slug}`
        : `/api/v1/teams/${team}`
    const res = await client.get<Team | TeamSummary>(url)
    // ensure posthog Team is up-to-date
    const data = res.data as Team
    const props: Record<string, unknown> = {
        'team-name': data.name,
        'created-at': data.createdAt,
        'count-applications': data.instanceCount,
        'count-instances': data.instanceCount,
        'count-members': data.memberCount
    }
    if ('billing' in res.data && data.billing) {
        props['billing-active'] = data.billing.active
        props['billing-canceled'] = data.billing.canceled
        props['billing-unmanaged'] = data.billing.unmanaged

        if ('trial' in data.billing) {
            props['billing-trial'] = data.billing.trial
            props['billing-trial-ended'] = data.billing.trialEnded
            props['billing-trial-ends-at'] = data.billing.trialEndsAt
        }
    }
    product.groupUpdate('team', data.id, props)

    return res.data
}

const deleteTeam = async (teamId: string) => {
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
 * @param includeInstances
 * @param includeApplicationDevices
 * @param excludeOwnerFiltering
 * @returns An array of application objects containing an array of instances
 */
const getTeamApplications = async (teamId: string, {
    associationsLimit,
    includeApplicationSummary = false,
    includeInstances = undefined,
    includeApplicationDevices = undefined,
    excludeOwnerFiltering = undefined
}: {
    associationsLimit?: number,
    includeApplicationSummary?: boolean,
    includeInstances?: boolean,
    includeApplicationDevices?: boolean,
    excludeOwnerFiltering?: boolean
} = {}) => {
    const options: { params: Record<string, unknown> } = { params: {} }
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

/**
 * Get a list of applications, their instances, their devices, and the status of each
 * @param {string} teamId The Team ID (hash) to get statuses for
 * @returns An array of application ids containing an array of instance and device statuses
 */
const getTeamApplicationsAssociationsStatuses = async (teamId: string, { associationsLimit }: { associationsLimit?: number } = {}) => {
    const options: { params?: Record<string, unknown> } = {}
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
const getTeamInstances = async (teamId: string) => {
    const res = await client.get(`/api/v1/teams/${teamId}/projects`)
    const promises = []
    res.data.projects = res.data.projects.map(r => {
        r.createdSince = daysSince(r.createdAt)
        r.updatedSince = daysSince(r.updatedAt)
        r.link = { name: 'application', params: { id: r.id } }
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

        r.link = { name: 'application', params: { id: r.id } }

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
    pagination = null,
    includeMeta = false,
    orderByMostRecentFlows = false,
    states = null,
    signal = null
} = {}) => {
    const {
        page = null,
        limit = 20,
        query = null,
        sort = null,
        dir = null
    } = pagination || {}
    const params = new URLSearchParams()

    params.append('limit', limit.toString())

    if (page !== null) params.append('page', String(page))
    if (query) params.append('query', query)
    if (sort) params.append('sort', sort)
    if (dir) params.append('dir', dir)
    if (includeMeta) params.append('includeMeta', includeMeta.toString())
    if (orderByMostRecentFlows) params.append('orderByMostRecentFlows', orderByMostRecentFlows.toString())
    if (states?.length) states.forEach(state => params.append('state', state))

    const res = await client.get(`/api/v1/teams/${teamId}/projects?${params.toString()}`, { signal })
    res.data.projects = res.data.projects.map(r => {
        if (r.flowLastUpdatedAt) {
            r.flowLastUpdatedSince = daysSince(r.flowLastUpdatedAt)
        }
        if (r.meta?.state) {
            r.status = r.meta.state
        }
        return r
    })
    return res.data
}

const getTeamMembers = (teamId: string) => {
    return client.get(`/api/v1/teams/${teamId}/members`).then(res => {
        return res.data
    })
}

const getTeamInvitations = (teamId: string): Promise<{ invitations: InvitationView[] }> => {
    return client.get<{ invitations: InvitationList }>(`/api/v1/teams/${teamId}/invitations`).then(res => {
        const invitations = res.data.invitations.map((r): InvitationView => ({
            ...r,
            roleName: RoleNames[r.role || Roles.Member],
            roleLabel: roleLabel(r.role || Roles.Member),
            createdSince: daysSince(r.createdAt),
            expires: elapsedTime(r.expiresAt, Date.now())
        }))
        return { ...res.data, invitations }
    })
}
const createTeamInvitation = (teamId: string, userDetails: string, role?: number) => {
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
const resendTeamInvitation = (teamId: string, inviteId: string): Promise<InvitationView> => {
    return client.post<Invitation>(`/api/v1/teams/${teamId}/invitations/${inviteId}`)
        .then((response) => response.data)
        .then((invitation) => {
            product.capture('$ff-invite-resent', {
                'invite-id': inviteId
            }, {
                team: teamId
            })

            return {
                ...invitation,
                roleName: RoleNames[invitation.role || Roles.Member],
                roleLabel: roleLabel(invitation.role || Roles.Member),
                createdSince: daysSince(invitation.createdAt),
                expires: elapsedTime(invitation.expiresAt, Date.now())
            }
        })
}

const create = async (options: { name: string, type: string }) => {
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

const changeTeamMemberRole = (teamId: string, userId: string, role: number | null = null, permissions: string[] | null = null) => {
    const opts: { role?: number, permissions?: string[] } = {}
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

const getTeamAuditLog = async (teamId: string, params: Record<string, unknown>, cursor?: string, limit?: number): Promise<{ log: AuditLogEntry[] }> => {
    const url = paginateUrl(`/api/v1/teams/${teamId}/audit-log`, cursor, limit)
    return client.get(url, { params }).then(res => res.data)
}
const getTeamCommsCreds = (teamId: string, sessionId: string) => {
    return client.post(`/api/v1/teams/${teamId}/comms-credentials`, { sessionId })
        .then(res => res.data)
}

const getTeamUserMembership = (teamId: string) => {
    return client.get(`/api/v1/teams/${teamId}/user`).then(res => res.data)
}
const updateTeam = async (teamId: string, options: Record<string, unknown>) => {
    return client.put(`/api/v1/teams/${teamId}`, options).then(res => {
        return res.data
    })
}

const getTeamDevices = async (teamId: string, cursor?: string, limit?: number, query?: string, extraParams = {}): Promise<{ devices: DeviceView[] }> => {
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

const getTeamRegistry = async (teamId: string, cursor?: string, limit?: number) => {
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

const getTeamLibrary = async (teamId: string, parentDir?: string, cursor?: string, limit?: number) => {
    const url = paginateUrl(`/storage/library/${teamId}/${parentDir || ''}`, cursor, limit)
    const res = await client.get(url)
    const meta: { type?: string } = {}
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
const deleteFromTeamLibrary = async (teamId: string, name: string, type: string | null = null) => {
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
const getTeamDeviceProvisioningTokens = async (teamId: string, cursor?: string, limit?: number) => {
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
const generateTeamDeviceProvisioningToken = async (teamId: string, options: { name?: string, application?: string, instance?: string, expiresAt?: string } = {}) => {
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
const updateTeamDeviceProvisioningToken = async (teamId: string, tokenId: string, options: { application?: string, instance?: string, expiresAt?: string } = {}) => {
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
const deleteTeamDeviceProvisioningToken = async (teamId: string, tokenId: string) => {
    return await client.delete(`/api/v1/teams/${teamId}/devices/provisioning/${tokenId}`)
}

/**
 * Bulk delete devices
 * @param {string} teamId - Team ID (hash)
 * @param {Array<string>} devices - Array of device IDs (hash)
 * @returns
 */
const bulkDeviceDelete = async (teamId: string, devices: string[]) => {
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
const bulkDeviceMove = async (teamId: string, devices: string[], moveTo: 'instance' | 'application' | 'unassigned' | 'group', id: string | null | undefined = undefined): Promise<{ devices: DeviceView[] }> => {
    const url = `/api/v1/teams/${teamId}/devices/bulk`
    const data: { devices: string[], instance?: string | null, application?: string | null, deviceGroup?: string | null } = { devices }
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

/**
 * Get a list of Dependencies / Bill of Materials
 * @param teamId
 * @returns {Promise<axios.AxiosResponse<any>>}
 */
const getDependencies = (teamId: string) => {
    return client.get(`/api/v1/teams/${teamId}/bom`)
        .then(res => res.data)
}

const getTeamDeviceGroups = (teamId: string) => {
    return client.get(`/api/v1/teams/${teamId}/device-groups`)
        .then(res => res.data)
}

const getGitTokens = async (teamId: string, cursor?: string) => {
    const url = paginateUrl(`/api/v1/teams/${teamId}/git/tokens`, cursor)
    return client.get(url).then(res => res.data)
}

const createGitToken = async (teamId: string, token: Record<string, unknown>) => {
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
    getTeamCommsCreds,
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
