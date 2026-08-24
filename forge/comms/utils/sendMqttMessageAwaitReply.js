const { v4: uuidv4 } = require('uuid')

const DEFAULT_TIMEOUT = 30000

/**
 * Generic MQTT v5 request/response correlator.
 *
 * Turns asynchronous MQTT publish/subscribe into awaitable calls by
 * generating a `correlationData` UUID per request and matching it
 * against incoming responses using MQTT v5 packet properties.
 *
 * The class does not publish or subscribe itself. The caller is
 * responsible for publishing the message (using the returned MQTT
 * options) and routing incoming responses to `resolve()`.
 *
 * @example
 * const awaitReply = new SendMqttMessageAwaitReply({ timeout: 10000 })
 *
 * // Wire up the response path (extract correlationData from MQTT v5 packet properties)
 * commsClient.on('response/my-channel', (payload, packet) => {
 *     awaitReply.resolve(packet.properties?.correlationData, payload)
 * })
 *
 * // Create a tracked request
 * const { correlationData, mqttOptions, promise } = awaitReply.create()
 *
 * // Publish with the MQTT v5 properties (correlationData travels in the packet, not the payload)
 * commsClient.publish(topic, JSON.stringify(data), mqttOptions)
 *
 * // Await the correlated response (or timeout)
 * const response = await promise
 */
class SendMqttMessageAwaitReply {
    /**
     * @param {object} [options]
     * @param {number} [options.timeout=30000] Default timeout in ms
     */
    constructor (options = {}) {
        this.defaultTimeout = options.timeout || DEFAULT_TIMEOUT
        /** @type {Object.<string, {resolve: function, timer: NodeJS.Timeout}>} */
        this.pending = {}
    }

    /**
     * Create a tracked request. Returns a `correlationData` UUID, MQTT v5
     * publish options containing that UUID, and a `promise` that resolves
     * when a matching response is passed to `resolve()`, or rejects on timeout.
     *
     * @param {object} [options]
     * @param {number} [options.timeout] Timeout in ms (overrides default)
     * @returns {{correlationData: string, mqttOptions: object, promise: Promise<object>}}
     */
    create (options = {}) {
        const timeout = options.timeout || this.defaultTimeout
        const correlationData = uuidv4()

        const mqttOptions = {
            properties: {
                correlationData
            }
        }

        const promise = new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                delete this.pending[correlationData]
                reject(new Error('Request timed out'))
            }, timeout)

            this.pending[correlationData] = { resolve, timer }
        })
        // A no-op safety net: guarantees this promise always has at least one rejection
        // handler, so a timeout can never surface as an unhandled rejection (fatal to the
        // process) regardless of what happens to the real caller's own await/catch.
        promise.catch(() => {})

        return { correlationData, mqttOptions, promise }
    }

    /**
     * Match an incoming response to a pending request and resolve the
     * associated promise.
     *
     * The correlationData should be extracted from the MQTT v5 packet
     * properties (`packet.properties.correlationData`), not from the
     * message payload.
     *
     * No-op if the correlationData is missing, does not match any pending
     * request, or has already been resolved/timed out.
     *
     * @param {string|Buffer} correlationData The MQTT v5 correlationData property
     * @param {object} payload The parsed message payload to resolve with
     */
    resolve (correlationData, payload) {
        if (!correlationData) {
            return
        }
        // MQTT v5 correlationData may arrive as a Buffer
        const key = typeof correlationData === 'string'
            ? correlationData
            : correlationData.toString()

        const entry = this.pending[key]
        if (!entry) {
            return
        }
        delete this.pending[key]
        clearTimeout(entry.timer)
        entry.resolve(payload)
    }

    /**
     * Clean up all pending requests, rejecting none. Intended for
     * graceful shutdown so timers don't fire after the process tears down.
     */
    clear () {
        for (const [id, entry] of Object.entries(this.pending)) {
            clearTimeout(entry.timer)
            delete this.pending[id]
        }
    }
}

module.exports = { SendMqttMessageAwaitReply }
