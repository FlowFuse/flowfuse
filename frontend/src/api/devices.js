import client from './client.js'
import product from '../services/product.js'
import paginateUrl from '../utils/paginateUrl.js'
import elapsedTime from '../utils/elapsedTime.js'
import daysSince from '../utils/daysSince.js'

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

const enableEditorTunnel = async (deviceId) => {
    // * Enable Device Editor (Step 2) - (frontendApi->forge:HTTP) {put} /api/v1/devices/{deviceId}/editor { tunnel: 'enable' }
    return client.put(`/api/v1/devices/${deviceId}/editor`, { tunnel: 'enable' }).then(res => {
        // * Enable Device Editor (Step 12) - (frontendApi->browser) return result step 1 (THE END)
        return res.data
    })
}

const disableEditorTunnel = async (deviceId) => {
    // (api->forge) {put} /api/v1/devices/{deviceId}/editor { tunnel: 'disable' }
    return client.put(`/api/v1/devices/${deviceId}/editor`, { tunnel: 'disable' }).then(res => {
        return res.data
    })
}

const getMode = async (deviceId) => {
    const device = await getDevice(deviceId)
    return device?.mode
}

const setMode = async (deviceId, mode) => {
    return client.put(`/api/v1/devices/${deviceId}/mode`, { mode }).then(res => {
        return res.data
    })
}

/**
 * create a snapshot from a device
 * @param {string} projectId - the project id
 * @param {string} deviceId - the device id
 * @param {object} options - the options
 * @param {string} options.name - the name of the snapshot
 * @param {string} [options.description] - the description of the snapshot
 * @param {boolean} [options.setAsTarget] - set the snapshot as the new target for all devices
 * @see https://docs.flowforge.io/api/#operation/createSnapshot
 */
const createSnapshot = async (projectId, deviceId, options) => {
    const data = {
        name: options.name, // name of the snapshot
        description: options.description, // description of the snapshot
        setAsTarget: options.setAsTarget // set the snapshot as the new target for all devices
    }
    return client.post(`/api/v1/devices/${deviceId}/snapshot`, data).then(res => {
        const props = {
            'created-at': res.data.createdAt,
            'snapshot-id': res.data.id,
            'snapshot-name': options.name,
            'snapshot-set-as-target': options.setAsTarget
        }
        res.data.createdSince = daysSince(res.data.createdAt)
        res.data.updatedSince = daysSince(res.data.updatedAt)
        product.capture('$ff-snapshot-device', props, {
            instance: projectId
        })
        return res.data
    })
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
    enableEditorTunnel,
    disableEditorTunnel,
    getMode,
    setMode,
    createSnapshot
}
