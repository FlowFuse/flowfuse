const mqtt = require('mqtt')
const EventEmitter = require('events')

/**
 * MQTT Client wrapper. This connects to the platform broker and subscribes
 * to the appropriate status topics.
 */
class CommsClient extends EventEmitter {
    constructor (app) {
        super()
        this.app = app
    }

    async init () {
        // To aid testing, we use a url of `:test:` to allow us to configure
        // the platform with comms enabled, but no active MQTT connection
        if (this.app.config.broker.url !== ':test:') {
            const brokerConfig = {
                clientId: 'forge_platform',
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
            this.client.on('error', (err) => {
                this.app.log.info(`Connection error to comms broker: ${err.toString()}`)
            })
            this.client.on('message', (topic, message) => {
                const topicParts = topic.split('/')
                const ownerType = topicParts[3]
                const ownerId = topicParts[4]
                if (ownerType === 'p') {
                    this.emit('status/project', {
                        id: ownerId,
                        status: message.toString()
                    })
                } else if (ownerType === 'd') {
                    this.emit('status/device', {
                        id: ownerId,
                        status: message.toString()
                    })
                }
            })
            this.client.subscribe([
                // Launcher status
                'ff/v1/+/l/+/status',
                // Device status
                'ff/v1/+/d/+/status'
            ])
        }
    }

    publish (topic, payload) {
        if (this.client) {
            this.client.publish(topic, payload)
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
