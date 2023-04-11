/**
 * TODO Mock instances API, that for now, just hits /projects
 */

import product from '../services/product.js'
import daysSince from '../utils/daysSince.js'
import paginateUrl from '../utils/paginateUrl.js'

import client from './client.js'

const create = async (options) => {
    return client.post('/api/v1/projects', options).then(res => {
        const props = {
            'created-at': res.data.createdAt,
            'instance-stack': res.data.stack.id,
            'instance-template': res.data.template.id
        }
        product.capture('$ff-instance-created', props, {
            team: res.data.team.id,
            application: options.applicationId,
            instance: res.data.id
        })
        product.groupUpdate('instance', res.data.id, props)
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
    return client.delete(`/api/v1/projects/${instance.id}`).then(res => {
        const timestamp = (new Date()).toISOString()
        product.capture('$ff-instance-deleted', {
            'deleted-at': timestamp
        }, {
            team: instance.team?.id,
            application: instance.application?.id,
            instance: instance.id
        })
        product.groupUpdate('instance', instanceId, {
            deleted: true,
            'deleted-at': timestamp
        })
    })
}

const getInstanceAuditLog = async (instanceId, params, cursor, limit) => {
    const url = paginateUrl(`/api/v1/projects/${instanceId}/audit-log`, cursor, limit)
    return client.get(url, { params }).then(res => res.data)
}

const getInstanceLogs = async (instanceId, cursor, limit) => {
    const url = paginateUrl(`/api/v1/projects/${instanceId}/logs`, cursor, limit)
    return client.get(url).then(res => res.data)
}
const startInstance = async (instance) => {
    return client.post(`/api/v1/projects/${instance.id}/actions/start`).then((res) => {
        product.capture('$ff-instance-action:start', null, {
            team: instance.team?.id,
            application: instance.application?.id,
            instance: instance.id
        })
        return res.data
    })
}
const restartInstance = async (instance) => {
    return client.post(`/api/v1/projects/${instanceId}/actions/restart`).then((res) => {
        product.capture('$ff-instance-action:restart', null, {
            team: instance.team?.id,
            application: instance.application?.id,
            instance: instance.id
        })
        return res.data
    })
}
const suspendInstance = async (instance) => {
    return client.post(`/api/v1/projects/${instanceId}/actions/suspend`).then((res) => {
        product.capture('$ff-instance-action:suspend', null, {
            team: instance.team?.id,
            application: instance.application?.id,
            instance: instance.id
        })
        return res.data
    })
}
const updateInstance = async (instanceId, options) => {
    return client.put(`/api/v1/projects/${instanceId}`, options).then(res => {
        return res.data
    })
}
const changeStack = async (instanceId, stackId) => {
    return client.put(`/api/v1/projects/${instanceId}`, { stack: stackId }).then(res => {
        product.groupUpdate('instance', instanceId, {
            stack: stackId
        })
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
