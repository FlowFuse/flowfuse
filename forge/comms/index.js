const fp = require('fastify-plugin')
const { CommsClient } = require('./commsClient')
const { DeviceCommsHandler } = require('./devices')
const ACLManager = require('./aclManager')

/**
 * This module represents the real-time comms component of the platform.
 * We depend on an external MQTT broker (mosquitto) and of the runtime configuration
 * to include the details needed to connect to it.
 *
 * This module handles
 *  - Incoming device status messages
 *  - Broker ACL requests
 *
 */
module.exports = fp(async function (app, _opts, next) {
    // Check the runtime configuration includes the minimum required configuration
    // to use the MQTT broker service
    if (app.config.broker && app.config.broker.url) {
        // Register the authentication routes the broker will be using
        await app.register(require('./authRoutes'), { prefix: '/api/comms/auth', logLevel: 'warn' })

        // Ensure we have a BrokerClient object (auth details) for use by the platform
        await app.db.controllers.BrokerClient.ensurePlatformClient()

        // Create the platform's client for connecting to the broker
        const client = new CommsClient(app)

        // Create the handler for any device-related messages
        const deviceCommsHandler = DeviceCommsHandler(app, client)

        // Not in the current release, but when we handle Launcher status
        // via MQTT, it will arrive here. Compare to the status/device handler in `devices.js`
        // client.on('status/project', (status) => {
        //     // console.log(status)
        // })

        // Setup the platform API for the comms component
        app.decorate('comms', {
            devices: deviceCommsHandler,
            aclManager: ACLManager(app)
        })

        app.ready().then(async () => {
            // Once the whole platform is ready, tell the client to connect
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
