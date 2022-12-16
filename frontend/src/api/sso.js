import client from './client'

// Get list of active SSO providers
const getProviders = async () => {
    return client.get('/ee/sso/providers').then(res => {
        return res.data
    })
}
const getProvider = async (id) => {
    return client.get(`/ee/sso/providers/${id}`).then(res => {
        return res.data
    })
}
const createProvider = async (options) => {
    return client.post('/ee/sso/providers', options).then(res => {
        return res.data
    })
}
const updateProvider = async (id, options) => {
    return client.put(`/ee/sso/providers/${id}`, options).then(res => {
        return res.data
    })
}
const deleteProvider = async (id) => {
    return await client.delete(`/ee/sso/providers/${id}`)
}
export default {
    createProvider,
    updateProvider,
    getProvider,
    deleteProvider,
    getProviders
}
