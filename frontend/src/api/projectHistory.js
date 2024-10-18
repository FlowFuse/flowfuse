import paginateUrl from '../utils/paginateUrl.js'

import client from './client.js'

const getHistory = async (instanceId, cursor = undefined, limit = 10) => {
    const url = paginateUrl(`/api/v1/projects/${instanceId}/history`, cursor, limit)

    return await client.get(url)
        .then(res => {
            return res.data
        })
}

export default {
    getHistory
}
