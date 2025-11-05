import client from './client.js'

/**
 * @returns {Promise<axios.AxiosResponse<any>>}
 */
const hydrate = async ({
    history,
    message,
    context = {},
    sessionId = null
} = {}) => {
    const url = '/api/v1/expert/fim/hydrate'

    return client.post(url, {
        history,
        message,
        context,
        sessionId
    }).then(res => res.data)
}

/**
 * @returns {Promise<axios.AxiosResponse<any>>}
 */
const sendMessage = async ({
    message,
    context = {},
    sessionId = null
} = {}) => {
    const url = '/api/v1/expert/fim/message'

    return client.post(url, {
        message,
        context,
        sessionId
    }).then(res => res.data)
}

export default {
    hydrate,
    sendMessage
}
