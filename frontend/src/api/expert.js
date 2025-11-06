import { v4 as uuidv4 } from 'uuid'

import client from './client.js'

// Direct API URL for testing
const EXPERT_API_URL = 'https://flowfuse-expert-api.flowfuse.dev/v3/expert'

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

    const headers = {
        'Content-Type': 'application/json'
    }

    // Add session tracking headers
    if (sessionId) {
        headers['X-Chat-Session-ID'] = sessionId
    }

    // Add transaction ID for response validation
    headers['X-Chat-Transaction-ID'] = transactionId

    const payload = {
        query
    }

    // Add instance context if provided
    if (instanceId) {
        payload.instanceId = instanceId
    }

    const requestOptions = {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
    }

    // Add abort signal if provided
    if (signal) {
        requestOptions.signal = signal
    }

    // Call the external API directly
    const response = await fetch(EXPERT_API_URL, requestOptions)

    if (!response.ok) {
        throw new Error(`Expert API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    // Validate transaction ID to prevent race conditions
    if (data.transactionId && data.transactionId !== transactionId) {
        throw new Error('Transaction ID mismatch - response may be from a different request')
    }

    return {
        answer: data.answer || [],
        transactionId: data.transactionId || transactionId,
        isMultiMessage: Array.isArray(data.answer) && data.answer.length > 1
    }
}

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
const hydrate = async ({
    history,
    context = {},
    sessionId = null
} = {}) => {
    const url = '/api/v1/expert/hydrate'

    return client.post(url, {
        history,
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
    const url = '/api/v1/expert/message'

    return client.post(url, {
        message,
        context,
        sessionId
    }).then(res => res.data)
}

export default {
    sendQuery,
    initSession,
    hydrate,
    sendMessage
}
