import client from './client.js'
import product from '../services/product.js'
import daysSince from '../utils/daysSince.js'
import paginateUrl from '../utils/paginateUrl.js'
import instanceApi from './instances.js'

/**
 * TODO: Currently hits project API
 */
const create = async (projectId, options) => {
    return client.post(`/api/v1/projects/${projectId}/snapshots`, options).then(res => {
        const props = {
            'created-at': res.data.createdAt,
            'snapshot-id': res.data.id,
            'snapshot-name': options.name,
            'snapshot-set-as-target': options.setAsTarget
        }
        res.data.createdSince = daysSince(res.data.createdAt)
        res.data.updatedSince = daysSince(res.data.updatedAt)
        product.capture('$ff-snapshot-created', props, {
            instance: projectId
        })
        return res.data
    })
}

const rollbackSnapshot = async (projectId, snapshotId) => {
    return instanceApi.rollbackInstance(projectId, snapshotId)
}

/**
 * TODO: Currently hits project API
 */
const deleteSnapshot = async (instanceId, snapshotId) => {
    return client.delete(`/api/v1/projects/${instanceId}/snapshots/${snapshotId}`).then(res => {
        product.capture('$ff-snapshot-deleted', {
            'snapshot-id': snapshotId,
            'deleted-at': (new Date()).toISOString()
        }, {
            instance: instanceId
        })
        return res.data
    })
}

/**
 * TODO: Currently hits project API
 */
const getSnapshot = (instanceId, snapshotId) => {
    return client.get(`/api/v1/projects/${instanceId}/snapshots/${snapshotId}`).then(res => {
        res.data.createdSince = daysSince(res.data.createdAt)
        res.data.updatedSince = daysSince(res.data.updatedAt)
        return res.data
    })
}

/**
 * TODO: Currently hits project API
 */
const getInstanceSnapshots = (instanceId, cursor, limit) => {
    const url = paginateUrl(`/api/v1/projects/${instanceId}/snapshots`, cursor, limit)
    return client.get(url).then(res => {
        res.data.snapshots = res.data.snapshots.map(ss => {
            ss.createdSince = daysSince(ss.createdAt)
            ss.updatedSince = daysSince(ss.updatedAt)
            return ss
        })
        return res.data
    })
}

export default {
    create,
    deleteSnapshot,
    rollbackSnapshot,
    getSnapshot,
    getInstanceSnapshots
}
