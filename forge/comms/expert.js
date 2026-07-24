// /**
//  * This module provides the handler for Expert events
//  */

const { randomUUID: uuidv4 } = require('crypto')

const BRIDGE_CACHE_NAME = 'expert-bridge-heartbeat-cache' // Name of the cache used to store bridge heartbeat responses and error counts
const BRIDGE_CACHE_MAX_DEFAULT = 100 // Default maximum number of entries in the cache. Each platform instance will have its own cache, so a small number here is fine. Can be overridden in the config if needed.
const BRIDGE_CACHE_TTL_DEFAULT = 3 * 60 * 1000 // Default 3 minutes (more than enough for the heartbeat task to run and receive a response, but short enough to prevent a large number of entries from accumulating in the cache)

/**
 * ExpertCommsHandler
 * @class ExpertCommsHandler
 * @memberof forge.comms
 */
class ExpertCommsHandler {
    /**
     * New ExpertCommsHandler instance
     * @param {import('../forge').ForgeApplication} app Fastify app
     * @param {import('./commsClient').CommsClient} client Comms Client
     */
    constructor (app, client) {
        this.app = app
        this.client = client
        /** @type {ReturnType<import('../../forge/caches/memory-cache').createCache>} */
        this.bridgeHeartbeatCache = app.caches.createCache(BRIDGE_CACHE_NAME, {
            max: app.config.expert?.centralBroker?.heartbeat?.bridgeCacheMax || BRIDGE_CACHE_MAX_DEFAULT,
            ttl: app.config.expert?.centralBroker?.heartbeat?.bridgeCacheTTL || BRIDGE_CACHE_TTL_DEFAULT,
            updateAgeOnGet: true // update the age on get, we want it to extend the ttl on access (required for the errorCount key to persist across multiple heartbeat requests)
        })
        this.setupEventHandlers()
    }

    setupEventHandlers () {
        this.client.on('response/platform/expert/bridge/heartbeat', this.bridgeHeartbeatResponseHandler.bind(this))
    }

    /**
     * Handle bridge heartbeat request - typically this is initiated by the housekeeper task: forge/ee/lib/expert/tasks/heartbeat.js
     * @param {number} maxResponseTime The maximum time to wait for a response before considering the heartbeat failed (in milliseconds)
     * @param {function(Error|null, { errorCount: number })} callback Callback function to handle the result of the heartbeat request
     */
    requestBridgeHeartbeat (maxResponseTime = 10000, callback) {
        // Here, we publish a message to the platform broker which is bridged to the Expert Broker.
        // Upon receipt of this message, the backend agent will echo it back and the comms client will trigger
        // the 'response/platform/expert/bridge/heartbeat' event, which is handled by this.bridgeHeartbeatResponseHandler() below.

        // Prepare the payload and correlation data for the heartbeat request
        const correlationData = uuidv4()
        const payload = { timestamp: Date.now(), platformId: this.client.platformId, correlationData }
        this.bridgeHeartbeatCache.get('errorCount') // a get hit keeps the errorCount key alive in the cache (no need to await it)
        clearTimeout(this.timer) // clear any existing timer before setting a new one

        const topic = 'ff/v1/expert/forge_platform/bridge/platform/heartbeat/response' // /response is the correct topic
        const mqttOptions = { qos: 1, retain: false, properties: { correlationData } }
        const payloadData = JSON.stringify(payload)

        // Send the heartbeat request and set a timer to check for a response after the maxResponseTime has elapsed
        this.client.publish(topic, payloadData, mqttOptions)
        this.timer = setTimeout(async () => {
            try {
                // get the associated response data from the cache after the maxResponseTime has elapsed
                const response = await this.bridgeHeartbeatCache.get(`response:${correlationData}`)
                if (response && response.properties.correlationData.toString() === correlationData) {
                    // SUCCESS: response received within the maxResponseTime, reset the error count
                    await this.bridgeHeartbeatCache.set('errorCount', 0)
                    await this.bridgeHeartbeatCache.del(`response:${correlationData}`)
                    callback && callback(null, { errorCount: 0 })
                } else {
                    // FAILED: no response received within the maxResponseTime, increment the error count
                    const errorCount = (await this.bridgeHeartbeatCache.get('errorCount') || 0) + 1
                    await this.bridgeHeartbeatCache.set('errorCount', errorCount)
                    callback && callback(new Error('Expert Agent Bridge heartbeat missed'), { errorCount })
                }
            } catch (err) {
                callback && callback(err)
            }
        }, maxResponseTime)
    }

    /**
     * Handle bridge heartbeat response
     * @param {Object} payload The received message
     * @param {import('mqtt').IClientPublishOptions['properties']} properties The message properties
     */
    bridgeHeartbeatResponseHandler (payload, properties) {
        // This event is triggered (emitted) in the commsClient when a valid heartbeat response is received from the Expert Broker via.
        // the bridge (Expert Broker → FF App Instance Broker) in response to a heartbeat request made in `this.requestBridgeHeartbeat()`.
        // Here we simply update the cache with the response. The cache is required since there may be replica instances of the FF App
        // and the expert platform topic is a shared topic, so the response may be received by a different instance than the one that initiated the request.
        this.bridgeHeartbeatCache.set(`response:${properties.correlationData}`, { payload, properties })
    }
}

module.exports = {
    ExpertCommsHandler
}
