import client from './client.js'

const getHistory = async (instanceId) => {
    return await client.get(`/api/v1/projects/${instanceId}/history`)
        .then(res => {
            return res.data
        })
}

export default {
    getHistory
}
