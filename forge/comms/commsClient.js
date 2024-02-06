const { randomBytes } = require('crypto')
const EventEmitter = require('events')

const mqtt = require('mqtt')
const { v4: uuidv4 } = require('uuid')

/**
 * MQTT Client wrapper. This connects to the platform broker and subscribes
 * to the appropriate status topics.
 */
class CommsClient extends EventEmitter {
    constructor (app) {
        super()
        this.app = app
        this.platformId = uuidv4()
    }

    async init () {
        // To aid testing, we use a url of `:test:` to allow us to configure
        // the platform with comms enabled, but no active MQTT connection
        if (this.app.config.broker.url !== ':test:') {
            /** @type {MQTT.IClientOptions} */
            const brokerConfig = {
                clientId: 'forge_platform:' + randomBytes(8).toString('hex'),
                username: 'forge_platform',
                password: await this.app.settings.get('commsToken'),
                reconnectPeriod: 5000
            }
            this.client = mqtt.connect(this.app.config.broker.url, brokerConfig)
            this.client.on('connect', () => {
                this.app.log.info('Connected to comms broker')
            })
            this.client.on('reconnect', () => {
                this.app.log.info('Reconnecting to comms broker')
            })
            this.client.on('disconnect', (disconnectPacket) => {
                const rc = disconnectPacket?.reasonCode || 'unknown reason code'
                const reason = disconnectPacket?.properties?.reasonString || 'no reason given'
                this.app.log.info(`Broker disconnected: reason code '${rc}'. ${reason}.`)
            })
            this.client.on('error', (err) => {
                this.app.log.info(`Connection error to comms broker: ${err.toString()}`)
            })
            this.client.on('message', (topic, message) => {
                const topicParts = topic.split('/')
                const ownerType = topicParts[3]
                const ownerId = topicParts[4]
                const messageType = topicParts[5]
                if (ownerType === 'p') {
                    this.emit('status/project', {
                        id: ownerId,
                        status: message.toString()
                    })
                } else if (ownerType === 'd') {
                    if (messageType === 'status') {
                        this.emit('status/device', {
                            id: ownerId,
                            status: message.toString()
                        })
                    } else if (messageType === 'logs') {
                        if (topicParts[6] && topicParts[6] === 'heartbeat') {
                            // track frontends
                            this.emit('logs/heartbeat', {
                                id: `${topicParts[2]}:${ownerId}`,
                                timestamp: Date.now()
                            })
                        }
                    } else if (messageType === 'response') {
                        const response = {
                            id: ownerId,
                            message: message.toString()
                        }
                        this.emit('response/device', response)
                    }
                }
            })
            this.client.subscribe([
                // Launcher status - shared subscription
                '$share/platform/ff/v1/+/l/+/status',
                // Device status - shared subscription
                '$share/platform/ff/v1/+/d/+/status',
                // Device response - not shared subscription
                'ff/v1/+/d/+/response/' + this.platformId,
                // Device logs heartbeat
                'ff/v1/+/d/+/logs/heartbeat'
            ])
        }
    }

    /**
     * Publish to a topic
     * @param {string} topic Topic to publish to
     * @param {*} payload the payload to publish
     * @param {mqtt.IClientPublishOptions} [options] publish options (optional)
     * @param {mqtt.PacketCallback} [callback] callback to call when the publish is complete (optional)
     * @returns {void}
     */
    publish (topic, payload, options, callback) {
        if (typeof options === 'function') {
            callback = options
            options = {}
        }
        if (this.client) {
            this.client.publish(topic, payload, options, (error, packet) => {
                if (callback) {
                    callback(error, packet)
                }
            })
        }
    }

    async disconnect () {
        if (this.client) {
            this.client.end()
        }
    }
}

module.exports = {
    CommsClient
}
