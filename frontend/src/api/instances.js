/**
 * TODO Mock instances API, that for now, just hits /projects
 */

import daysSince from '../utils/daysSince'
import paginateUrl from '../utils/paginateUrl'

import client from './client'

const create = async (options) => {
    return client.post('/api/v1/projects', options).then(res => {
        return res.data
    })
}

const getInstance = (instanceId) => {
    return client.get(`/api/v1/projects/${instanceId}`).then(res => {
        res.data.createdSince = daysSince(res.data.createdAt)
        res.data.updatedSince = daysSince(res.data.updatedAt)
        res.data.flowLastUpdatedSince = daysSince(res.data.flowLastUpdatedAt)
        return res.data
    })
}

const deleteInstance = async (instanceId) => {
    return client.delete(`/api/v1/projects/${instanceId}`)
}

const getInstanceAuditLog = async (instanceId, params, cursor, limit) => {
    const url = paginateUrl(`/api/v1/projects/${instanceId}/audit-log`, cursor, limit)
    return client.get(url, { params }).then(res => res.data)
}

const getInstanceLogs = async (instanceId, cursor, limit) => {
    const url = paginateUrl(`/api/v1/projects/${instanceId}/logs`, cursor, limit)
    return client.get(url).then(res => res.data)
}
const startInstance = async (instanceId) => {
    return client.post(`/api/v1/projects/${instanceId}/actions/start`).then(res => res.data)
}
const restartInstance = async (instanceId) => {
    return client.post(`/api/v1/projects/${instanceId}/actions/restart`).then(res => res.data)
}
const suspendInstance = async (instanceId) => {
    return client.post(`/api/v1/projects/${instanceId}/actions/suspend`).then(res => res.data)
}
const updateInstance = async (instanceId, options) => {
    return client.put(`/api/v1/projects/${instanceId}`, options).then(res => {
        return res.data
    })
}
const changeStack = async (instanceId, stackId) => {
    return client.put(`/api/v1/projects/${instanceId}`, { stack: stackId }).then(res => {
        return res.data
    })
}

const importInstance = async (instanceId, components) => {
    return client.post(`/api/v1/projects/${instanceId}/import`, components).then(res => {

    })
}

const getInstanceDevices = async (instanceId, cursor, limit) => {
    const url = paginateUrl(`/api/v1/projects/${instanceId}/devices`, cursor, limit)
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

const getInstanceDeviceSettings = async (instanceId) => {
    return client.get(`/api/v1/projects/${instanceId}/devices/settings`).then(res => res.data)
}
const updateInstanceDeviceSettings = async (instanceId, settings) => {
    return client.post(`/api/v1/projects/${instanceId}/devices/settings`, settings).then(res => res.data)
}

export default {
    create,
    getInstance,
    deleteInstance,
    getInstanceLogs,
    getInstanceAuditLog,
    startInstance,
    restartInstance,
    suspendInstance,
    updateInstance,
    changeStack,
    importInstance,
    getInstanceDevices,
    getInstanceDeviceSettings,
    updateInstanceDeviceSettings
}
