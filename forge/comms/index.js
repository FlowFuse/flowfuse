const fp = require('fastify-plugin')
const { CommsClient } = require('./commsClient')
const { DeviceCommsHandler } = require('./devices')

module.exports = fp(async function (app, _opts, next) {
    if (app.config.broker && app.config.broker.url) {
        await app.db.controllers.BrokerClient.ensurePlatformClient()
        const client = new CommsClient(app)

        const deviceCommsHandler = DeviceCommsHandler(app, client)

        client.on('status/project', (status) => {
            console.log(status)
        })

        client.on('status/device', (status) => { deviceCommsHandler.handleStatus(status) })

        app.ready().then(async () => {
            await client.init()
        })
        app.addHook('onClose', async (_) => {
            app.log.info('Comms shutdown')
            await client.disconnect()
        })

        app.decorate('comms', {
            devices: deviceCommsHandler
        })
    } else {
        app.log.warn('[comms] Broker not configured - comms unavailable')
    }
    next()
})
