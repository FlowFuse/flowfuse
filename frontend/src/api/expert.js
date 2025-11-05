import client from './client.js'

/**
 * @returns {Promise<axios.AxiosResponse<any>>}
 */
const hydrate = async ({
    history,
    message,
    context = {}
} = {}) => {
    const url = '/api/v1/expert/fim/hydrate'

    return client.post(url, {
        history,
        message,
        context
    }).then(res => {
        return res.data
    })
}

/**
 * @returns {Promise<axios.AxiosResponse<any>>}
 */
const sendMessage = async ({
    message,
    context = {}
} = {}) => {
    const url = '/api/v1/expert/fim/message'

    return client.post(url, {
        message,
        context
    }).then(res => {
        return res.data
    })
}

export default {
    hydrate,
    sendMessage
}
