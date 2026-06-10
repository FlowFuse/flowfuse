'use strict'

const { v4: uuidv4 } = require('uuid')

/**
 * MqttDispatch - Dispatches flow-building actions to a user's browser
 * via MQTT inflight topics and waits for the response.
 *
 * Used when an external MCP client calls a flow-building tool. The forge
 * platform acts as the "agent", publishing inflight requests and
 * subscribing to inflight responses using the same protocol the expert
 * agent uses.
 *
 * The MQTT v5 correlationData property is used to correlate requests
 * with responses (same pattern as devices.js ResponseMonitor).
 */
class MqttDispatch {
    /**
     * @param {import('../../../forge').ForgeApplication} app
     */
    constructor (app) {
        this.app = app
        /** @type {Map<string, { resolve: Function, reject: Function, timer: NodeJS.Timeout, responseTopic: string }>} */
        this.pendingRequests = new Map()
        this.TIMEOUT = 30000 // 30 seconds
        this._boundMessageHandler = null
        this._subscribedTopics = new Set()
    }

    /**
     * Get the CommsClient instance from the app.
     * @returns {import('../../../comms/commsClient').CommsClient|null}
     */
    _getCommsClient () {
        return this.app.comms?.devices?.client || null
    }

    /**
     * Get the raw MQTT client for subscribe/unsubscribe operations.
     * @returns {import('mqtt').MqttClient|null}
     */
    _getMqttClient () {
        const commsClient = this._getCommsClient()
        return commsClient?.client || null
    }

    /**
     * Ensure the global message handler is attached to the raw MQTT client.
     * This handler routes incoming messages to any pending request that
     * matches the response topic.
     */
    _ensureMessageHandler () {
        if (this._boundMessageHandler) return

        const mqttClient = this._getMqttClient()
        if (!mqttClient) return

        this._boundMessageHandler = (topic, message, packet) => {
            // Only process topics we are watching
            if (!this._subscribedTopics.has(topic)) return

            try {
                const correlationId = packet?.properties?.correlationData
                    ? Buffer.from(packet.properties.correlationData).toString()
                    : null

                // Try to match by correlationId first, then by topic
                let pending = null
                let pendingKey = null

                if (correlationId && this.pendingRequests.has(correlationId)) {
                    pending = this.pendingRequests.get(correlationId)
                    pendingKey = correlationId
                } else {
                    // Fallback: match by response topic (for clients that don't
                    // echo correlationData)
                    for (const [key, req] of this.pendingRequests) {
                        if (req.responseTopic === topic) {
                            pending = req
                            pendingKey = key
                            break
                        }
                    }
                }

                if (pending && pendingKey) {
                    clearTimeout(pending.timer)
                    this.pendingRequests.delete(pendingKey)

                    const result = JSON.parse(message.toString())
                    pending.resolve(result)

                    // Unsubscribe from this response topic if no other
                    // pending requests need it
                    this._maybeUnsubscribe(pending.responseTopic)
                }
            } catch (err) {
                this.app.log.warn(`MqttDispatch: error processing response: ${err.message}`)
            }
        }

        mqttClient.on('message', this._boundMessageHandler)
    }

    /**
     * Unsubscribe from a response topic if no pending requests reference it.
     * @param {string} responseTopic
     */
    _maybeUnsubscribe (responseTopic) {
        // Check if any other pending request uses this topic
        for (const req of this.pendingRequests.values()) {
            if (req.responseTopic === responseTopic) return
        }

        const mqttClient = this._getMqttClient()
        if (mqttClient) {
            mqttClient.unsubscribe(responseTopic)
        }
        this._subscribedTopics.delete(responseTopic)
    }

    /**
     * Dispatch an action to the user's browser via MQTT and wait for the result.
     *
     * @param {object} session - Editor session { sessionId, userId, teamId }
     * @param {string} projectId - The instance ID
     * @param {string} actionName - e.g. 'automation:add-nodes'
     * @param {object} params - Action parameters
     * @returns {Promise<object>} Result from the browser's nr-assistant
     */
    async dispatchAndWait (session, projectId, actionName, params) {
        const mqttClient = this._getMqttClient()
        const commsClient = this._getCommsClient()
        if (!mqttClient || !commsClient) {
            throw new Error('MQTT comms not available')
        }

        this._ensureMessageHandler()

        const correlationId = uuidv4()

        // Build MQTT topics using a dedicated mcp namespace so the expert
        // agent's NR instance (subscribed to ff/v1/expert/...) never sees these.
        // Frontend subscribes to: ff/v1/mcp/{userId}/{sessionId}/p/{projectId}/support/inflight/{inflightType}/request
        // Frontend publishes to:  ff/v1/mcp/{userId}/{sessionId}/p/{projectId}/support/inflight/{inflightType}/response
        const baseTopic = `ff/v1/mcp/${session.userId}/${session.sessionId}/p/${projectId}/support/inflight`
        const requestTopic = `${baseTopic}/${actionName}/request`
        const responseTopic = `${baseTopic}/${actionName}/response`

        // Subscribe to the response topic before publishing the request
        if (!this._subscribedTopics.has(responseTopic)) {
            await new Promise((resolve, reject) => {
                mqttClient.subscribe(responseTopic, { qos: 2 }, (err) => {
                    if (err) return reject(err)
                    this._subscribedTopics.add(responseTopic)
                    resolve()
                })
            })
        }

        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                this.pendingRequests.delete(correlationId)
                this._maybeUnsubscribe(responseTopic)
                reject(new Error(`Timeout waiting for action '${actionName}' response from browser`))
            }, this.TIMEOUT)

            this.pendingRequests.set(correlationId, {
                resolve,
                reject,
                timer,
                responseTopic
            })

            // Build the payload matching the inflight protocol.
            // Include correlationId and sessionId in the payload body because
            // the forge_platform MQTT client uses protocol v3.1.1 (no v5 properties).
            const payload = JSON.stringify({
                status: actionName,
                toolname: actionName,
                params,
                source: 'forge-mcp',
                correlationId,
                sessionId: session.sessionId
            })

            commsClient.publish(requestTopic, payload, { qos: 2 })
        })
    }
}

module.exports = { MqttDispatch }
