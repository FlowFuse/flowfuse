import product from '../services/product'
import daysSince from '../utils/daysSince'
import elapsedTime from '../utils/elapsedTime'
import paginateUrl from '../utils/paginateUrl'

import client from './client'

import type { Device, DeviceSummary, InstanceHttpTokenSummaryList } from '@/types'

type DeviceView = DeviceSummary & { lastSeenSince: string }

type DeviceDetailView = Device & { lastSeenSince: string }

type DeviceActionTarget = {
    id: string
    ownerType?: string | null
    team?: { id?: string } | null
    instance?: { id?: string } | null
    application?: { id?: string } | null
    project?: { id?: string } | null
}

const getDevices = async (cursor?: string, limit?: number): Promise<{ devices: DeviceView[] }> => {
    const url = paginateUrl('/api/v1/devices', cursor, limit)
    return client.get(url).then(res => {
        res.data.devices.forEach(device => {
            device.lastSeenSince = device.lastSeenAt ? elapsedTime(0, device.lastSeenMs) + ' ago' : ''
        })
        return res.data
    })
}

const create = async (options: { type?: string } & Record<string, unknown>) => {
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
const deleteDevice = async (deviceId: string, teamId: string) => {
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
const getDevice = async (deviceId: string): Promise<DeviceDetailView> => {
    return await client.get(`/api/v1/devices/${deviceId}`).then(res => {
        const device = res.data
        device.lastSeenSince = device.lastSeenAt ? elapsedTime(0, device.lastSeenMs) + ' ago' : ''
        res.data = device
        return res.data
    })
}
const updateDevice = async (deviceId: string, options: Record<string, unknown>) => {
    return client.put(`/api/v1/devices/${deviceId}`, options).then(res => {
        return res.data
    })
}

const generateCredentials = async (deviceId: string) => {
    return client.post(`/api/v1/devices/${deviceId}/generate_credentials`).then(res => {
        return res.data
    })
}

const getSettings = async (deviceId: string) => {
    return client.get(`/api/v1/devices/${deviceId}/settings`).then(res => {
        return res.data
    })
}

const updateSettings = async (deviceId: string, settings: Record<string, unknown>) => {
    return client.put(`/api/v1/devices/${deviceId}/settings`, settings).then(res => {
        return res.data
    })
}

const enableEditorTunnel = async (deviceId: string) => {
    // * Enable Device Editor (Step 2) - (frontendApi->forge:HTTP) {put} /api/v1/devices/{deviceId}/editor { enabled: true }
    return client.put(`/api/v1/devices/${deviceId}/editor`, { enabled: true }).then(res => {
        // * Enable Device Editor (Step 12) - (frontendApi->browser) return result step 1 (THE END)
        return res.data
    })
}

const disableEditorTunnel = async (deviceId: string) => {
    // (api->forge) {put} /api/v1/devices/{deviceId}/editor { tunnel: 'disable' }
    return client.put(`/api/v1/devices/${deviceId}/editor`, { enabled: false }).then(res => {
        return res.data
    })
}

const getMode = async (deviceId: string): Promise<string | undefined> => {
    const device = await getDevice(deviceId)
    return device?.mode
}

const setMode = async (deviceId: string, mode: string) => {
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
const createSnapshot = async (device: DeviceActionTarget, options: { name: string, description?: string, setAsTarget?: boolean }) => {
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
const getDeviceSnapshot = (deviceId: string, snapshotId: string) => {
    return client.get(`/api/v1/devices/${deviceId}/snapshots/${snapshotId}`).then(res => {
        res.data.createdSince = daysSince(res.data.createdAt)
        res.data.updatedSince = daysSince(res.data.updatedAt)
        return res.data
    })
}

// TODO: move to deviceSnapshots.js
const getDeviceSnapshots = (deviceId: string, cursor?: string, limit?: number, query: string | null = null) => {
    const url = paginateUrl(`/api/v1/devices/${deviceId}/snapshots`, cursor, limit, query)
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
const deleteSnapshot = async (deviceId: string, snapshotId: string) => {
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

const setSnapshotAsTarget = async (deviceId: string, snapshotId: string) => {
    return (await updateDevice(deviceId, { targetSnapshot: snapshotId }))
}

const getDeviceAuditLog = async (deviceId: string, params: Record<string, unknown>, cursor?: string, limit?: number) => {
    const url = paginateUrl(`/api/v1/devices/${deviceId}/audit-log`, cursor, limit)
    return client.get(url, { params }).then(res => res.data)
}

const getDeviceLogCreds = async (deviceId: string) => {
    const url = `/api/v1/devices/${deviceId}/logs`
    return client.post(url).then(res => res.data)
}

const getDeviceResourcesCreds = async (deviceId: string) => {
    const url = `/api/v1/devices/${deviceId}/resources`
    return client.post(url).then(res => res.data)
}

const startDevice = async (device: DeviceActionTarget) => {
    return client.post(`/api/v1/devices/${device.id}/actions/start`).then((res) => {
        productCaptureDeviceAction('start', device)
        return res.data
    })
}
const restartDevice = async (device: DeviceActionTarget) => {
    return client.post(`/api/v1/devices/${device.id}/actions/restart`).then((res) => {
        productCaptureDeviceAction('restart', device)
        return res.data
    })
}
const suspendDevice = async (device: DeviceActionTarget) => {
    return client.post(`/api/v1/devices/${device.id}/actions/suspend`).then((res) => {
        productCaptureDeviceAction('suspend', device)
        return res.data
    })
}

function productCaptureDeviceAction (action: string, device: DeviceActionTarget) {
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

/**
 * Generates a snapshot description for a specific project instance.
 *
 * This asynchronous function interacts with the API to create a snapshot description
 * for the given device identified by its hash ID.
 *
 * @param {string} deviceId - The unique identifier of the project instance for which
 * the snapshot description is to be generated.
 * @returns {Promise<Object>} A promise that resolves to the data containing the snapshot
 * description information.
 * @throws {Error} If the API call fails or an error occurs during the process.
 */
const generateSnapshotDescription = async (deviceId: string, target: string) => {
    return client.post(`/api/v1/devices/${deviceId}/generate/snapshot-description`, { target })
        .then(res => {
            return res.data.data
        })
}

const getDeviceEditorProxy = async (editorUrl: string) => {
    return client.get(editorUrl)
}

const getHTTPTokens = async (deviceId: string): Promise<InstanceHttpTokenSummaryList> => {
    return client.get(`/api/v1/devices/${deviceId}/httpTokens`).then(res => res.data)
}

const createHTTPToken = async (deviceId: string, name: string, scope: string, expiresAt?: string) => {
    const data = {
        name,
        scope,
        expiresAt
    }
    return client.post(`/api/v1/devices/${deviceId}/httpTokens`, data).then(res => res.data)
}

const updateHTTPToken = async (deviceId: string, tokenId: string, scope: string, expiresAt?: string) => {
    const data = {
        scope,
        expiresAt
    }
    return client.put(`/api/v1/devices/${deviceId}/httpTokens/${tokenId}`, data).then(res => res.data)
}

const deleteHTTPToken = async (deviceId: string, tokenId: string) => {
    return client.delete(`/api/v1/devices/${deviceId}/httpTokens/${tokenId}`)
}
const checkRegistrationSession = async (sessionToken: string) => {
    return client.get(`/api/v1/devices/_/register/status/${sessionToken}`).then(res => res.data)
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
    getDeviceResourcesCreds,
    suspendDevice,
    restartDevice,
    startDevice,
    generateSnapshotDescription,
    getDeviceEditorProxy,
    getHTTPTokens,
    createHTTPToken,
    updateHTTPToken,
    deleteHTTPToken,
    checkRegistrationSession
}
