import client from './client'

const getSettings = async () => {
    return client.get('/api/v1/settings').then(res => {
        return res.data
    })
}

const updateSettings = async (options) => {
    return client.put('/api/v1/settings', options).then(res => {
        return res.data
    })
}
export default {
    getSettings,
    updateSettings
}
