import { v4 as uuidv4 } from 'uuid'

import client from './client.js'

/**
 * Initialize or retrieve a session ID for conversation tracking
 * @returns {string} UUID session ID
 */
const initSession = () => {
    return uuidv4()
}

/**
 * @returns {Promise<axios.AxiosResponse<any>>}
 */
const chat = async ({
    history,
    query,
    context = {},
    sessionId = null
} = {}) => {
    const transactionId = uuidv4()
    const url = '/api/v1/expert/chat'

    return client.post(url, { history, query, context }, {
        headers: {
            'X-Chat-Session-ID': sessionId,
            'X-Chat-Transaction-ID': transactionId
        }
    }).then(res => {
        // Validate transaction ID to prevent race conditions
        if (res.data.transactionId !== transactionId) {
            throw new Error('Transaction ID mismatch - response may be from a different request')
        }

        return res.data
    })
}

export default {
    initSession,
    chat
}
