const mqtt = require('mqtt')
const EventEmitter = require('events')

class CommsClient extends EventEmitter {
    constructor (app) {
        super()
        this.app = app
    }

    async init () {
        const brokerConfig = {
            clientId: 'forge_platform',
            username: 'forge_platform',
            password: await this.app.settings.get('commsToken'),
            reconnectPeriod: 5000
        }
        this.client = mqtt.connect(this.app.config.broker.url, brokerConfig)
        this.client.on('connect', () => {
            console.log('connected')
        })
        this.client.on('reconnect', () => {
            console.log('reconnect')
        })
        this.client.on('error', (err) => {
            console.log('error', err)
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
            'ff/v1/+/p/+/status',
            'ff/v1/+/d/+/status'
        ])
    }

    async disconnect () {
        this.client.end()
    }
}

module.exports = {
    CommsClient
}
