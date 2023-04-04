import client from './client.js'
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
        return res.data
    })
}
const deleteDevice = async (deviceId) => {
    return await client.delete(`/api/v1/devices/${deviceId}`)
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

const startLogs = async (deviceId) => {}

const stopLogs = async (deviceId) => {}

export default {
    create,
    getDevice,
    deleteDevice,
    getDevices,
    updateDevice,
    generateCredentials,
    getSettings,
    updateSettings,
    startLogs,
    stopLogs
}
