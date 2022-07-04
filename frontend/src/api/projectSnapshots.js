import client from './client'
import daysSince from '@/utils/daysSince'
import paginateUrl from '@/utils/paginateUrl'
import projectApi from '@/api/project'

const create = async (projectId, options) => {
    return client.post(`/api/v1/projects/${projectId}/snapshots`, options).then(res => {
        res.data.createdSince = daysSince(res.data.createdAt)
        res.data.updatedSince = daysSince(res.data.updatedAt)
        return res.data
    })
}

const rollbackSnapshot = async (projectId, snapshotId) => {
    return projectApi.rollbackProject(projectId, snapshotId)
}

const deleteSnapshot = async (projectId, snapshotId) => {
    return client.delete(`/api/v1/projects/${projectId}/snapshots/${snapshotId}`).then(res => {
        return res.data
    })
}

const getSnapshot = (projectId, snapshotId) => {
    return client.get(`/api/v1/projects/${projectId}/snapshots/${snapshotId}`).then(res => {
        res.data.createdSince = daysSince(res.data.createdAt)
        res.data.updatedSince = daysSince(res.data.updatedAt)
        return res.data
    })
}

const getProjectSnapshots = (projectId, cursor, limit) => {
    const url = paginateUrl(`/api/v1/projects/${projectId}/snapshots`, cursor, limit)
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
    getProjectSnapshots
}
