const fp = require('fastify-plugin')
const { CommsClient } = require('./commsClient')
const { DeviceCommsHandler } = require('./devices')
const ACLManager = require('./aclManager')

module.exports = fp(async function (app, _opts, next) {
    if (app.config.broker && app.config.broker.url) {
        await app.register(require('./authRoutes'), { prefix: '/api/comms/auth', logLevel: 'warn' })

        await app.db.controllers.BrokerClient.ensurePlatformClient()
        const client = new CommsClient(app)

        const deviceCommsHandler = DeviceCommsHandler(app, client)

        client.on('status/project', (status) => {
            // console.log(status)
        })

        client.on('status/device', (status) => { deviceCommsHandler.handleStatus(status) })

        app.decorate('comms', {
            devices: deviceCommsHandler,
            aclManager: ACLManager(app)
        })

        app.ready().then(async () => {
            await client.init()
        })
        app.addHook('onClose', async (_) => {
            app.log.info('Comms shutdown')
            await client.disconnect()
        })
    } else {
        app.log.warn('[comms] Broker not configured - comms unavailable')
    }
    next()
})
