import daysSince from '../utils/daysSince.js'
import elapsedTime from '../utils/elapsedTime.js'
import paginateUrl from '../utils/paginateUrl.js'

import client from './client.js'

const getStats = async (options) => {
    return client.get('/api/v1/admin/stats', options).then(res => {
        return res.data
    })
}

const getLicenseDetails = async (options) => {
    return client.get('/api/v1/admin/license', options).then(res => {
        if (res.data.expiresAt) {
            res.data.expires = elapsedTime(res.data.expiresAt, Date.now())
            return res.data
        }
        return null
    })
}

const updateLicense = async (options) => {
    return client.put('/api/v1/admin/license', options).then(res => {
        if (res.data.expiresAt) {
            res.data.expires = elapsedTime(res.data.expiresAt, Date.now())
            return res.data
        }
        return null
    })
}

const getInvitations = async (options) => {
    return client.get('/api/v1/admin/invitations', options).then(res => {
        res.data.invitations = res.data.invitations.map(r => {
            r.createdSince = daysSince(r.createdAt)
            r.expires = elapsedTime(r.expiresAt, Date.now())
            return r
        })
        return res.data
    })
}

const getPlatformAuditLog = async (params, cursor, limit) => {
    const url = paginateUrl('/api/v1/admin/audit-log', cursor, limit)
    return client.get(url, { params }).then(res => res.data)
}

const generateStatsAccessToken = async () => {
    return client.post('/api/v1/admin/stats-token', {}).then(res => {
        return res.data
    })
}

const deleteStatsAccessToken = async () => {
    return client.delete('/api/v1/admin/stats-token').then(res => {
        return res.data
    })
}

const generateExpertAgentCreds = async () => {
    return client.post('/api/v1/admin/expert-agent-creds', {}).then(res => {
        return res.data
    })
}

const deleteExpertAgentCreds = async () => {
    return client.delete('/api/v1/admin/expert-agent-creds').then(res => {
        return res.data
    })
}

const getAnnouncementNotifications = async () => {
    return client.get('/api/v1/admin/announcements')
        .then(res => {
            return res.data
        })
}

/**
 * The ids of every team matching a search and filter, for building an
 * announcement audience out of more teams than a page of the list holds.
 */
const getTeamIdsForFilter = async (query, filter = {}) => {
    const params = new URLSearchParams()
    if (query) {
        params.set('query', query)
    }
    Object.entries(filter).forEach(([key, value]) => {
        if (Array.isArray(value) ? value.length : value) {
            params.set(key, Array.isArray(value) ? value.join(',') : value)
        }
    })
    const suffix = params.toString()
    return client.get('/api/v1/admin/teams/ids' + (suffix ? '?' + suffix : ''))
        .then(res => res.data)
}

const sendAnnouncementNotification = async ({ title, message, filter, mock, to, url, format, video, cta }) => {
    return client.post('/api/v1/admin/announcements', { message, title, filter, mock, to, url, format, video, cta })
        .then(res => {
            return res.data
        })
}

/**
 * Calls api routes in admin.js
 * See [routes/api/admin.js](../../../forge/routes/api/admin.js)
*/
export default {
    getStats,
    getLicenseDetails,
    updateLicense,
    getInvitations,
    getPlatformAuditLog,
    generateStatsAccessToken,
    deleteStatsAccessToken,
    generateExpertAgentCreds,
    deleteExpertAgentCreds,
    getAnnouncementNotifications,
    getTeamIdsForFilter,
    sendAnnouncementNotification
}
