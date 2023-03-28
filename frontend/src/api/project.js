/**
 * This file is deprecated
 * New methods should only be added to ./application or ./instances
 *
 * All methods in this file should slowly be moved to  ./application or ./instances
 */
import client from './client'
import daysSince from '@/utils/daysSince'
import paginateUrl from '@/utils/paginateUrl'

const create = async (options) => {
    return client.post('/api/v1/projects', options).then(res => {
        return res.data
    })
}

const getProject = (projectId) => {
    return client.get(`/api/v1/projects/${projectId}`).then(res => {
        res.data.createdSince = daysSince(res.data.createdAt)
        res.data.updatedSince = daysSince(res.data.updatedAt)
        res.data.flowLastUpdatedSince = daysSince(res.data.flowLastUpdatedAt)
        return res.data
    })
}

const getProjectAuditLog = async (projectId, params, cursor, limit) => {
    const url = paginateUrl(`/api/v1/projects/${projectId}/audit-log`, cursor, limit)
    return client.get(url, { params }).then(res => res.data)
}

const getProjectLogs = async (projectId, cursor, limit) => {
    const url = paginateUrl(`/api/v1/projects/${projectId}/logs`, cursor, limit)
    return client.get(url).then(res => res.data)
}
const startProject = async (projectId) => {
    return client.post(`/api/v1/projects/${projectId}/actions/start`).then(res => res.data)
}
const stopProject = async (projectId) => {
    return client.post(`/api/v1/projects/${projectId}/actions/stop`).then(res => res.data)
}
const restartProject = async (projectId) => {
    return client.post(`/api/v1/projects/${projectId}/actions/restart`).then(res => res.data)
}
const suspendProject = async (projectId) => {
    return client.post(`/api/v1/projects/${projectId}/actions/suspend`).then(res => res.data)
}
const updateProject = async (projectId, options) => {
    return client.put(`/api/v1/projects/${projectId}`, options).then(res => {
        return res.data
    })
}
const rollbackProject = async (projectId, snapshotId) => {
    const data = {
        snapshot: snapshotId
    }
    return client.post(`/api/v1/projects/${projectId}/actions/rollback`, data).then(res => res.data)
}
const changeStack = async (projectId, stackId) => {
    return client.put(`/api/v1/projects/${projectId}`, { stack: stackId }).then(res => {
        return res.data
    })
}

const importProject = async (projectId, components) => {
    return client.post(`/api/v1/projects/${projectId}/import`, components).then(res => {

    })
}

const getProjectDeviceSettings = async (projectId) => {
    return client.get(`/api/v1/projects/${projectId}/devices/settings`).then(res => res.data)
}
const updateProjectDeviceSettings = async (projectId, settings) => {
    return client.post(`/api/v1/projects/${projectId}/devices/settings`, settings).then(res => res.data)
}

export default {
    create,
    getProject,
    getProjectLogs,
    getProjectAuditLog,
    startProject,
    stopProject,
    restartProject,
    suspendProject,
    updateProject,
    rollbackProject,
    changeStack,
    importProject,
    getProjectDeviceSettings,
    updateProjectDeviceSettings
}
