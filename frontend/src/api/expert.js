import { v4 as uuidv4 } from 'uuid'

import client from './client.js'

/**
 * Send a query to the FlowFuse Expert assistant
 * @param {string} query - The user's question or prompt
 * @param {string} sessionId - Session ID for conversation tracking
 * @param {string} instanceId - Optional instance ID for context
 * @param {AbortSignal} signal - Optional abort signal for cancellation
 * @returns {Promise<{answer: Array, transactionId: string}>}
 */
const sendQuery = async (query, sessionId = null, instanceId = null, signal = null) => {
    // Generate transaction ID for race condition prevention
    const transactionId = uuidv4()

    const config = {
        headers: {}
    }

    // Add session tracking headers
    if (sessionId) {
        config.headers['X-Chat-Session-ID'] = sessionId
    }

    // Add transaction ID for response validation
    config.headers['X-Chat-Transaction-ID'] = transactionId

    // Add abort signal if provided
    if (signal) {
        config.signal = signal
    }

    const payload = {
        query
    }

    // Add instance context if provided
    if (instanceId) {
        payload.instanceId = instanceId
    }

    // Call the backend endpoint
    // Note: Endpoint will be determined by backend implementation
    // Could be /api/v1/expert or /api/v1/assistant/expert
    return client.post('/api/v1/expert/query', payload, config).then(res => {
        // Validate transaction ID to prevent race conditions
        if (res.data.transactionId && res.data.transactionId !== transactionId) {
            throw new Error('Transaction ID mismatch - response may be from a different request')
        }

        return {
            answer: res.data.answer || [],
            transactionId: res.data.transactionId || transactionId,
            isMultiMessage: Array.isArray(res.data.answer) && res.data.answer.length > 1
        }
    })
}

/**
 * Initialize or retrieve a session ID for conversation tracking
 * @returns {string} UUID session ID
 */
const initSession = () => {
    return uuidv4()
}

export default {
    sendQuery,
    initSession
}
