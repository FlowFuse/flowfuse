import client from './client.js'
import product from '../services/product.js'
import paginateUrl from '../utils/paginateUrl.js'
import elapsedTime from '../utils/elapsedTime.js'

const getDevices = async (cursor, limit) => {
    const url = paginateUrl('/api/v1/devices', cursor, limit)
    return client.get(url).then(res => {
        res.data.devices.forEach(device => {
            device.lastSeenSince = device.lastSeenAt ? elapsedTime(0, device.lastSeenMs) + ' ago' : ''
        })
        return res.data
    })
}

const create = async (options) => {
    return client.post('/api/v1/devices/', options).then(res => {
        const props = {
            'device-type': options.type,
            'created-at': res.data.createdAt
        }
        product.capture('$ff-device-created', props, {
            team: res.data.team.id
        })
        product.groupUpdate('device', res.data.id, props)
        return res.data
    })
}
const deleteDevice = async (deviceId, teamId) => {
    return await client.delete(`/api/v1/devices/${deviceId}`).then(() => {
        product.capture('$ff-device-deleted', {
            'deleted-at': (new Date()).toISOString()
        }, {
            team: teamId
        })
        product.groupUpdate('device', deviceId, {
            deleted: true
        })
    })
}
const getDevice = async (deviceId) => {
    return await client.get(`/api/v1/devices/${deviceId}`).then(res => {
        const device = res.data
        device.lastSeenSince = device.lastSeenAt ? elapsedTime(0, device.lastSeenMs) + ' ago' : ''
        res.data = device
        return res.data
    })
}
const updateDevice = async (deviceId, options) => {
    return client.put(`/api/v1/devices/${deviceId}`, options).then(res => {
        return res.data
    })
}

const generateCredentials = async (deviceId) => {
    return client.post(`/api/v1/devices/${deviceId}/generate_credentials`).then(res => {
        return res.data
    })
}

const getSettings = async (deviceId) => {
    return client.get(`/api/v1/devices/${deviceId}/settings`).then(res => {
        return res.data
    })
}

const updateSettings = async (deviceId, settings) => {
    return client.put(`/api/v1/devices/${deviceId}/settings`, settings).then(res => {
        return res.data
    })
}

const startEditor = async (deviceId) => {
    return client.post(`/api/v1/devices/${deviceId}/startEditor`).then(res => {
        return res.data
    })
}

const stopEditor = async (deviceId) => {
    return client.post(`/api/v1/devices/${deviceId}/stopEditor`).then(res => {})
}

export default {
    create,
    getDevice,
    deleteDevice,
    getDevices,
    updateDevice,
    generateCredentials,
    getSettings,
    updateSettings,
    startEditor,
    stopEditor
}
