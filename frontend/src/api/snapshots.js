import product from '../services/product.js'
import daysSince from '../utils/daysSince.js'

import client from './client.js'

/**
 * Get summary of a snapshot
 */
const getSummary = (snapshotId) => {
    return client.get(`/api/v1/snapshots/${snapshotId}`).then(res => {
        res.data.createdSince = daysSince(res.data.createdAt)
        res.data.updatedSince = daysSince(res.data.updatedAt)
        return res.data
    })
}

/**
 * Get full snapshot
 */
const getFullSnapshot = (snapshotId) => {
    return client.get(`/api/v1/snapshots/${snapshotId}/full`).then(res => {
        res.data.createdSince = daysSince(res.data.createdAt)
        res.data.updatedSince = daysSince(res.data.updatedAt)
        return res.data
    })
}

/**
 * Export a snapshot for later import in another project or platform
 */
const exportSnapshot = (snapshotId, options) => {
    return client.post(`/api/v1/snapshots/${snapshotId}/export`, options).then(res => {
        const props = {
            'snapshot-id': res.data.id
        }
        product.capture('$ff-snapshot-export', props, {})
        return res.data
    })
}

/**
 * Delete a snapshot
 * @param {String} snapshotId - id of the snapshot
 */
const deleteSnapshot = async (snapshotId) => {
    return client.delete(`/api/v1/snapshots/${snapshotId}`).then(res => {
        const props = {
            'snapshot-id': snapshotId,
            'deleted-at': (new Date()).toISOString()
        }
        product.capture('$ff-snapshot-deleted', props, {})
        return res.data
    })
}

const uploadSnapshot = async (ownerId, ownerType, snapshot, credentialSecret) => {
    return client.post('/api/v1/snapshots/upload', {
        ownerId,
        ownerType,
        snapshot,
        credentialSecret
    }).then(res => {
        const props = {
            'snapshot-id': res.data.id
        }
        product.capture('$ff-snapshot-uploaded', props, {})
        return res.data
    })
}

export default {
    deleteSnapshot,
    getFullSnapshot,
    exportSnapshot,
    getSummary,
    uploadSnapshot
}
