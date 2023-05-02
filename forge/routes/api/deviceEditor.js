/**
 * Device Editor access /api/v1/remote/editor/
 * @param {import('../../forge').ForgeApplication} app - forge application
 * @namespace devices
 * @memberof forge.routes.api
 */
module.exports = async function (app) {
    /**
     * Initiate inbound websocket connection from device
     * @name /api/v1/remote/editor/inboundWS/:deviceId/:access_token
     */
    app.get('/inboundWS/:deviceId/:access_token', {
        config: { allowAnonymous: true },
        websocket: true
    }, (connection, request) => {
        // * Enable Device Editor (Step 9) - (device:WS->forge) websocket connect request from device
        // This is the inbound websocket connection from the device
        const deviceId = request.params.deviceId
        const token = request.params.access_token
        const tunnelManager = getTunnelManager()
        const tunnelInfo = tunnelManager.getTunnelStatus(deviceId)
        if (tunnelInfo.exists) {
            if (tunnelManager.verifyToken(deviceId, token)) {
                const tunnelSetupOK = tunnelManager.initTunnel(deviceId, token, connection)
                if (!tunnelSetupOK) {
                    connection.socket.close(1008, 'Tunnel setup failed') // TODO: need to pick the right status code here
                }
            } else {
                connection.socket.close(1008, 'Invalid token') // TODO: need to pick the right status code here
            }
        } else {
            connection.socket.close(1008, 'No tunnel')
        }
    })

    /**
     * HTTP GET: verify adminAuth token
     * As this will be called by NR auth, this endpoint cannot be protected by the
     * normal forge auth middleware
     * @name /api/v1/remote/editor/
     */
    app.get('/', {
        config: { allowAnonymous: true }
    }, async (request, reply) => {
        const tunnelManager = getTunnelManager()
        if (tunnelManager.verifyToken(request.headers['x-device-id'], request.headers['x-access-token'])) {
            reply.code(200).send({ username: 'forge', permissions: '*' })
            return
        }
        reply.code(401).send({ code: 'unauthorized', error: 'unauthorized' })
    })

    /**
     * HTTP GET and WS requests from device
     * @name /api/v1/remote/editor/:deviceId/*
     */
    app.route({
        method: 'GET', // only GET is permitted for WS
        url: '/:deviceId/*',
        handler: (request, reply) => {
            // Handle HTTP GET requests from the device
            const tunnelManager = getTunnelManager()
            if (tunnelManager.handleHTTP(request.params.deviceId, request, reply)) {
                return
            } else if (tunnelManager.getTunnelStatus(request.params.deviceId).exists) {
                reply.code(502).send() // Bad Gateway (tunnel exists but it has lost connection or is in an intermediate state)
                return
            }
            // tunnel does not exist
            reply.code(503).send() // Service Unavailable
        },
        wsHandler: (connection, request) => {
            // Handle WS connection from the device
            const tunnelManager = getTunnelManager()
            if (tunnelManager.handleWS(request.params.deviceId, connection, request)) {
                return // handled
            }
            // not handled
            connection.socket.close(1008, 'No tunnel established')
        }
    })

    /**
     * HTTP POST, DELETE, PUT requests from device
     * @name /api/v1/remote/editor/:deviceId/*
     */
    app.route({
        method: ['POST', 'DELETE', 'PUT', 'HEAD', 'OPTIONS'],
        url: '/:deviceId/*',
        handler: (request, reply) => {
            const tunnelManager = getTunnelManager()
            if (tunnelManager.handleHTTP(request.params.deviceId, request, reply)) {
                return // handled
            } else if (tunnelManager.getTunnelStatus(request.params.deviceId).exists) {
                reply.code(502).send() // Bad Gateway (tunnel exists but it has lost connection or is in an intermediate state)
                return
            }
            // tunnel does not exist
            reply.code(503).send() // Service Unavailable
        }
    })

    // #region Helpers
    /**
     * Get the device tunnel manager for the app
     * @returns {import('../../comms/DeviceTunnelManager').DeviceTunnelManager}
     */
    function getTunnelManager () {
        return app.comms.devices.tunnelManager
    }
    // #endregion
}
