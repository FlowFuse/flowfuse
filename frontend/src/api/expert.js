import { v4 as uuidv4 } from 'uuid'

import client from './client.js'

/**
 * @returns {Promise<axios.AxiosResponse<any>>}
 */
const chat = async ({
    history,
    query,
    context = {},
    sessionId = null,
    abortController = null
} = {}) => {
    const transactionId = uuidv4()
    const url = '/api/v1/expert/chat'

    return client.post(url, { history, query, context }, {
        signal: abortController?.signal,
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

const getCapabilities = async (payload) => {
    const transactionId = uuidv4()
    return client.post('/api/v1/expert/mcp/features', payload, {
        headers: {
            'X-Chat-Transaction-ID': transactionId
        }
    }).then(res => {
        if (res.data.transactionId !== transactionId) {
            // ignore transaction ID mismatch for this endpoint for now
            console.warn('Transaction ID mismatch - response may be from a different request')
            return {}
        }
        return res.data
    })
}

export default {
    chat,
    getCapabilities
}
