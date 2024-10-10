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
 * Import a snapshot into a project or device
 * @param {String} ownerId - id of the owner
 * @param {'device'|'instance'} ownerType - type of the owner (device or instance)
 * @param {Object} snapshot - snapshot object to import
 * @param {String} [credentialSecret] - secret to use when decrypting credentials in the snapshot object (optional/only required when the snapshot contains credentials)
 */
const importSnapshot = async (ownerId, ownerType, snapshot, credentialSecret, options) => {
    return client.post('/api/v1/snapshots/import', {
        ownerId,
        ownerType,
        snapshot,
        credentialSecret,
        components: options?.components
    }).then(res => {
        const props = {
            'snapshot-id': res.data.id
        }
        product.capture('$ff-snapshot-import', props, {
            'owner-id': ownerId,
            'owner-type': ownerType
        })
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

/**
 * Update a snapshot
 * @param {String} snapshotId - id of the snapshot
 * @param {Object} options - options to update
 * @param {String} [options.name] - name of the snapshot
 * @param {String} [options.description] - description of the snapshot
 */
const updateSnapshot = async (snapshotId, options) => {
    return client.put(`/api/v1/snapshots/${snapshotId}`, options).then(res => {
        const props = {
            'snapshot-id': snapshotId,
            'updated-at': (new Date()).toISOString()
        }
        product.capture('$ff-snapshot-updated', props, {})
        return res.data
    })
}

export default {
    getSummary,
    getFullSnapshot,
    exportSnapshot,
    importSnapshot,
    deleteSnapshot,
    updateSnapshot
}
