import paginateUrl from '../utils/paginateUrl.js'

import client from './client.js'

const getInstanceHistory = async (instanceId, cursor = undefined, limit = 10) => {
    const url = paginateUrl(`/api/v1/projects/${instanceId}/history`, cursor, limit)

    return await client.get(url)
        .then(res => {
            return res.data
        })
}

const getDeviceHistory = async (instanceId, cursor = undefined, limit = 10) => {
    const url = paginateUrl(`/api/v1/devices/${instanceId}/history`, cursor, limit)

    return await client.get(url)
        .then(res => {
            return res.data
        })
}

export default {
    getInstanceHistory,
    getDeviceHistory
}
