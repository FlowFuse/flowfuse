const fp = require('fastify-plugin')

const ACLManager = require('./aclManager')
const { CommsClient } = require('./commsClient')
const { DeviceCommsHandler } = require('./devices')

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
module.exports = fp(async function (app, _opts) {
    // Check the runtime configuration includes the minimum required configuration
    // to use the MQTT broker service
    if (app.config.broker && app.config.broker.url) {
        // Register the authentication routes the broker will be using
        await app.register(require('./authRoutes'), { prefix: '/api/comms/auth', logLevel: app.config.logging.http })
        await app.register(require('./v2AuthRoutes'), { prefix: '/api/comms/v2', logLevel: app.config.logging.http })

        // Ensure we have a BrokerClient object (auth details) for use by the platform
        await app.db.controllers.BrokerClient.ensurePlatformClient()

        // Create the platform's client for connecting to the broker
        const client = new CommsClient(app)

        // Create the handler for any device-related messages
        const deviceCommsHandler = DeviceCommsHandler(app, client)

        function publishInstanceState (teamHash, instanceId, meta) {
            if (!teamHash || !instanceId) return
            const msg = { id: instanceId, meta: meta || null, ts: Date.now() }
            client.publish(`ff/v1/${teamHash}/p/${instanceId}/state`, JSON.stringify(msg), { retain: true })
        }
        function publishDeviceState (teamHash, deviceId, meta) {
            if (!teamHash || !deviceId) return
            const msg = { id: deviceId, meta: meta || null, ts: Date.now() }
            client.publish(`ff/v1/${teamHash}/d/${deviceId}/state`, JSON.stringify(msg), { retain: true })
        }
        // empty + retain:true clears the broker's retained message
        function clearInstanceState (teamHash, instanceId) {
            if (!teamHash || !instanceId) return
            client.publish(`ff/v1/${teamHash}/p/${instanceId}/state`, '', { retain: true })
        }
        function clearDeviceState (teamHash, deviceId) {
            if (!teamHash || !deviceId) return
            client.publish(`ff/v1/${teamHash}/d/${deviceId}/state`, '', { retain: true })
        }

        client.on('status/project', (status) => {
            try {
                const meta = status.status ? JSON.parse(status.status) : null
                publishInstanceState(status.teamId, status.id, meta)
            } catch (err) {
                if (!(err instanceof SyntaxError)) {
                    app.log.error({ msg: 'Failed to relay instance state', project: status.id, team: status.teamId, err: err.message })
                }
            }
        })

        // Setup the platform API for the comms component
        app.decorate('comms', {
            devices: deviceCommsHandler,
            aclManager: ACLManager(app),
            platform: {
                settings: {
                    sync: function (key) {
                        const msg = {
                            key,
                            srcId: client.platformId
                        }
                        client.publish('ff/v1/platform/sync', JSON.stringify(msg))
                    }
                },
                housekeeper: {
                    vote: function (vote) {
                        const msg = {
                            vote,
                            id: client.platformId
                        }
                        client.publish('ff/v1/platform/leader', JSON.stringify(msg))
                    }
                }
            },
            team: {
                notify: function (teamHash, reason, srcId) {
                    if (!teamHash) return
                    const msg = { reason: reason || null, srcId: srcId || null }
                    client.publish(`ff/v1/${teamHash}/team/updated`, JSON.stringify(msg))
                },
                notifyMembership: function (teamHash, userHash, reason, srcId) {
                    if (!teamHash || !userHash) return
                    const msg = { reason: reason || null, srcId: srcId || null }
                    client.publish(`ff/v1/${teamHash}/u/${userHash}/membership`, JSON.stringify(msg))
                },
                publishInstanceState,
                publishDeviceState,
                clearInstanceState,
                clearDeviceState
            }
        })

        app.addHook('onReady', async () => {
            try {
                await client.init()
            } catch (err) {
                app.log.info('[comms] problem starting comms client:', err.toString())
            }
        })
        app.addHook('onClose', async (_) => {
            app.log.info('Comms shutdown')
            await deviceCommsHandler.stopLogWatcher()
            client.publish('ff/v1/platform/leader', JSON.stringify({ id: client.platformId, vote: -1 }))
            await client.disconnect()
        })
    } else {
        app.log.warn('[comms] Broker not configured - comms unavailable')
    }
}, {
    name: 'app.comms'
})
