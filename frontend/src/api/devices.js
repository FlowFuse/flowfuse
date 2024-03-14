import product from '../services/product.js'
import daysSince from '../utils/daysSince.js'
import elapsedTime from '../utils/elapsedTime.js'
import paginateUrl from '../utils/paginateUrl.js'

import client from './client.js'

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
    // * Enable Device Editor (Step 2) - (frontendApi->forge:HTTP) {put} /api/v1/devices/{deviceId}/editor { enabled: true }
    return client.put(`/api/v1/devices/${deviceId}/editor`, { enabled: true }).then(res => {
        // * Enable Device Editor (Step 12) - (frontendApi->browser) return result step 1 (THE END)
        return res.data
    })
}

const disableEditorTunnel = async (deviceId) => {
    // (api->forge) {put} /api/v1/devices/{deviceId}/editor { tunnel: 'disable' }
    return client.put(`/api/v1/devices/${deviceId}/editor`, { enabled: false }).then(res => {
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
 * @param {string} device - the device
 * @param {object} options - the options
 * @param {string} options.name - the name of the snapshot
 * @param {string} [options.description] - the description of the snapshot
 * @param {boolean} [options.setAsTarget] - set the snapshot as the new target for all devices
 */
const createSnapshot = async (device, options) => {
    const ownerType = device.ownerType || (device.instance?.id ? 'instance' : (device.application?.id ? 'application' : null))
    const instanceId = device.instance?.id
    const applicationId = device.application?.id
    const deviceId = device.id
    const data = {
        name: options.name, // name of the snapshot
        description: options.description, // description of the snapshot
        setAsTarget: options.setAsTarget // set the snapshot as the new target for all devices
    }
    const url = ownerType === 'application' ? `/api/v1/devices/${deviceId}/snapshots` : `/api/v1/devices/${deviceId}/snapshot`
    return client.post(url, data).then(res => {
        const props = {
            ownerType,
            ownerId: ownerType === 'instance' ? instanceId : applicationId,
            'created-at': res.data.createdAt,
            'snapshot-id': res.data.id,
            'snapshot-name': options.name,
            'snapshot-set-as-target': options.setAsTarget
        }
        res.data.createdSince = daysSince(res.data.createdAt)
        res.data.updatedSince = daysSince(res.data.updatedAt)
        product.capture('$ff-snapshot-device', props, {
            ownerType: device.ownerType,
            instance: instanceId,
            application: applicationId
        })
        return res.data
    })
}

// TODO: move to deviceSnapshots.js
const getDeviceSnapshot = (deviceId, snapshotId) => {
    return client.get(`/api/v1/devices/${deviceId}/snapshots/${snapshotId}`).then(res => {
        res.data.createdSince = daysSince(res.data.createdAt)
        res.data.updatedSince = daysSince(res.data.updatedAt)
        return res.data
    })
}

// TODO: move to deviceSnapshots.js
const getDeviceSnapshots = (deviceId, cursor, limit) => {
    const url = paginateUrl(`/api/v1/devices/${deviceId}/snapshots`, cursor, limit)
    return client.get(url).then(res => {
        res.data.snapshots = res.data.snapshots.map(ss => {
            ss.createdSince = daysSince(ss.createdAt)
            ss.updatedSince = daysSince(ss.updatedAt)
            return ss
        })
        return res.data
    })
}

// TODO: move to deviceSnapshots.js
const deleteSnapshot = async (deviceId, snapshotId) => {
    return client.delete(`/api/v1/devices/${deviceId}/snapshots/${snapshotId}`).then(res => {
        product.capture('$ff-snapshot-deleted', {
            'snapshot-id': snapshotId,
            'deleted-at': (new Date()).toISOString()
        }, {
            device: deviceId
        })
        return res.data
    })
}

const setSnapshotAsTarget = async (deviceId, snapshotId) => {
    return (await updateDevice(deviceId, { targetSnapshot: snapshotId }))
}

const getDeviceAuditLog = async (deviceId, params, cursor, limit) => {
    const url = paginateUrl(`/api/v1/devices/${deviceId}/audit-log`, cursor, limit)
    return client.get(url, { params }).then(res => res.data)
}

const getDeviceLogCreds = async (deviceId) => {
    const url = `/api/v1/devices/${deviceId}/logs`
    return client.post(url).then(res => res.data)
}

const startDevice = async (device) => {
    return client.post(`/api/v1/devices/${device.id}/actions/start`).then((res) => {
        productCaptureDeviceAction('start', device)
        return res.data
    })
}
const restartDevice = async (device) => {
    return client.post(`/api/v1/devices/${device.id}/actions/restart`).then((res) => {
        productCaptureDeviceAction('restart', device)
        return res.data
    })
}
const suspendDevice = async (device) => {
    return client.post(`/api/v1/devices/${device.id}/actions/suspend`).then((res) => {
        productCaptureDeviceAction('suspend', device)
        return res.data
    })
}

function productCaptureDeviceAction (action, device) {
    if (!device) {
        return
    }
    product.capture(`$ff-device-action:${action}`, null, {
        team: device.team?.id,
        application: device.application?.id,
        instance: device.project?.id,
        ownerType: device.ownerType,
        device: device.id
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
    createSnapshot,
    getDeviceSnapshot,
    getDeviceSnapshots,
    deleteSnapshot,
    setSnapshotAsTarget,
    getDeviceAuditLog,
    getDeviceLogCreds,
    suspendDevice,
    restartDevice,
    startDevice
}
