const mqtt = require('async-mqtt')

class CommsClient {
    constructor (app, securityManager) {
        this.app = app
        this.securityManager = securityManager
    }

    async init () {
        const brokerConfig = {
            clientId: 'forge_platform',
            username: 'forge_platform',
            password: await this.app.settings.get('commsToken')
        }
        this.client = await mqtt.connectAsync(this.app.config.broker.url, brokerConfig)
        this.client.on('error', (err) => { console.log(err); this.emit('error', err) })
        this.client.on('message', (topic, message) => {
            console.log(message.toString())
        })
        await this.client.subscribe('foo')
    }
}

module.exports = {
    CommsClient
}
