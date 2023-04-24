/**
 * Device Editor access /api/v1/remote/editor/
 * @param {import('../../forge').ForgeApplication} app - forge application
 * @namespace devices
 * @memberof forge.routes.api
 */
module.exports = async function (app) {
    /**
     * Initiate inbound websocket connection from device
     * @name /api/v1/remote/editor/inboundWS/:getDeviceProjectId
     */
    app.get('/inboundWS/:deviceId/:token', {
        config: { allowAnonymous: true },
        websocket: true
    }, (connection, request) => {
        // * Enable Device Editor (Step 9) - (device:WS->forge) websocket connect request from device
        // This is the inbound websocket connection from the device
        const deviceId = request.params.deviceId
        const token = request.params.token
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
     * HTTP GET and WS requests from device
     * @name /api/v1/remote/editor/:deviceId
     */
    app.route({
        // config: { allowAnonymous: true },
        method: 'GET',
        url: '/:deviceId/*',
        handler: (request, reply) => {
            // Handle HTTP GET requests from the device
            const tunnelManager = getTunnelManager()
            if (tunnelManager.handleHTTP(request.params.deviceId, request, reply)) {
                return
            }
            reply.code(503).send() // TODO: need to pick the right status code here
        },
        wsHandler: (connection, request) => {
            // Handle WS connection from the device
            const tunnelManager = getTunnelManager()
            if (tunnelManager.handleWS(request.params.deviceId, connection, request)) {
                return // handled
            }
            // not handled
            connection.socket.close(1008, 'No tunnel') // TODO: need to pick the right status code here
        }
    })

    /**
     * HTTP POST, DELETE, PUT requests from device
     * @name /api/v1/remote/editor/:deviceId
     */
    app.route({
        method: ['POST', 'DELETE', 'PUT'],
        url: '/:deviceId/*',
        handler: (request, reply) => {
            const tunnelManager = getTunnelManager()
            if (tunnelManager.handleHTTP(request.params.deviceId, request, reply)) {
                return // handled
            }
            // not handled
            reply.code(503).send() // TODO: need to pick the right status code here
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
