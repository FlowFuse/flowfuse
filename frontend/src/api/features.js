import client from './client'

// Get information on which features are enabled server-side
const getFeatures = async () => {
    return client.get('/ee/features').then(res => {
        return res.data
    })
}

export default {
    getFeatures
}
