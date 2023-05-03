import client from './client.js'
import daysSince from '../utils/daysSince.js'
import elapsedTime from '../utils/elapsedTime.js'
import paginateUrl from '../utils/paginateUrl.js'

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
    deleteStatsAccessToken
}
