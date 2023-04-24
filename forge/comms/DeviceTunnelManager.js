/**
 * DeviceTunnelManager class definition
 * The DeviceTunnelManager is responsible for managing the tunnels to devices
 * All of the objects, connections, timeouts, etc. are managed by the
 * DeviceTunnelManager and are not exposed to the rest of the application
 * @module DeviceTunnelManager
 * @memberof module:comms
 */

/**
 * A DeviceTunnel object keeps track of connections to a device.
 * @typedef {Object} DeviceTunnel
 * @property {string} deviceId - Device ID
 * @property {number} counter - Number of active connections
 * @property {SocketStream} socket - Socket connection to device
 * @property {Array<FastifyRequest>} requests - List of pending requests
 * @property {Object} forwardedWS - List of forwarded websocket connections
 * @property {string} token - Token used to authenticate device
 * @property {httpHandler} _handleHTTP - Handle inbound HTTP request from device
 * @property {wsHandler} _handleWS - Handle inbound websocket connection from device
 */

// Type definition (imports)
/**
 * @typedef {import('@fastify/websocket')} fastifyWebsocket
 * @typedef {import('@fastify/websocket').SocketStream} SocketStream
 * @typedef {import('../forge').FastifyInstance} FastifyInstance
 * @typedef {import('../forge').FastifyRequest} FastifyRequest
 * @typedef {import('../forge').FastifyReply} FastifyReply
 * @typedef {(request: FastifyRequest, reply: FastifyReply) => void} httpHandler
 * @typedef {(connection: WebSocket, request: FastifyRequest) => void} wsHandler
 */

class DeviceTunnelManager {
    // private members
    /** @type {Map<String, DeviceTunnel>} */ #tunnels

    /**
     * Create a new DeviceTunnelManager
     * @param {FastifyInstance} app Fastify app
     * @constructor
     * @memberof module:comms
     * @alias DeviceTunnelManager
     */
    constructor (app) {
        /** @type {FastifyInstance} */
        this.app = app
        this.#tunnels = new Map()
    }

    /**
     * Create a new tunnel for the specified device
     * Once created, the tunnel will be available for the device to setup
     * the handlers and initiate the connection
     * Care should be taken to ensure that the tunnel is closed when no longer required
     * but this is not strictly necessary as the tunnel should be closed automatically
     * @param {String} deviceId Device ID
     * @param {String} token Token to use for tunnel
     * @see DeviceTunnelManager#initTunnel
     * @see DeviceTunnelManager#closeTunnel
     * @see DeviceTunnelManager#removeTunnel
     */
    newTunnel (deviceId, token) {
        const manager = this

        // ensure existing tunnel is closed
        manager.closeTunnel(deviceId)

        // create a new tunnel object & add to list
        manager.#tunnels.set(deviceId, newTunnel(deviceId, token))

        return !!manager.#getTunnel(deviceId)
    }

    /**
     * Get existing tunnel for device
     * @param {String} deviceId Device ID
     * @private
     * @returns { DeviceTunnel } Null if no tunnel exists or if a token is provided but does not match
     */
    #getTunnel (deviceId) {
        let tunnel = null
        if (this.#tunnels.has(deviceId)) {
            tunnel = this.#tunnels.get(deviceId) || null
        }
        return tunnel
    }

    /**
     * Get existing tunnel for device
     * @param {String} deviceId Device ID
     */
    getTunnelStatus (deviceId) {
        const exists = this.#tunnels.has(deviceId)
        const url = this.getTunnelUrl(deviceId, false)
        const urlWithToken = this.getTunnelUrl(deviceId, true)
        const enabled = this.isEnabled(deviceId)
        const connected = this.isConnected(deviceId)
        return { exists, url, urlWithToken, enabled, connected }
    }

    closeTunnel (deviceId) {
        const tunnel = this.#getTunnel(deviceId)
        if (tunnel?.socket) {
            tunnel.socket.close()
            tunnel.socket.removeAllListeners()
        }
        this.removeTunnel(deviceId)
    }

    removeTunnel (deviceId) {
        if (this.#tunnels.has(deviceId)) {
            return this.#tunnels.delete(deviceId)
        }
    }

    getTunnelUrl (deviceId, includeToken = false) {
        const tunnel = this.#getTunnel(deviceId)
        if (tunnel) {
            if (includeToken) {
                return `/api/v1/remote/editor/${deviceId}/?token=${tunnel.token}`
            }
            return `/api/v1/remote/editor/${deviceId}/`
        }
        return ''
    }

    isEnabled (deviceId) {
        const tunnel = this.#getTunnel(deviceId)
        return !!(tunnel && tunnel.token)
    }

    isConnected (deviceId) {
        const tunnel = this.#getTunnel(deviceId)
        return !!(tunnel && tunnel.socket)
    }

    /**
     * setup the tunnel socket properties and event handlers for the specified device
     * @param {String} deviceId The device ID
     * @param {String} token The token to use for the tunnel
     * @param {SocketStream} inboundDeviceConnection The websocket connection from the device
     * @returns {Boolean} True if the tunnel was started successfully
     */
    initTunnel (deviceId, token, inboundDeviceConnection) {
        const manager = this

        const tunnel = manager.#getTunnel(deviceId)
        if (!tunnel || manager.verifyToken(deviceId, token) === false) {
            return false
        }

        // ensure tunnel is not already open
        if (tunnel.socket) {
            tunnel.socket.close()
            tunnel.socket.removeAllListeners()
        }

        tunnel.socket = inboundDeviceConnection.socket

        // handle messages from device
        tunnel.socket.on('message', msg => {
            const response = JSON.parse(msg.toString())
            if (response.id === undefined) {
                return
            }
            // See if we have a reply for this incoming message. If so, send it to the device.
            // Otherwise, it's a websocket message, so forward it to the device editor websocket
            const reply = tunnel.requests[response.id]
            if (reply) {
                reply.headers(response.headers ? response.headers : {})
                reply.code(response.status)
                if (response.body) {
                    reply.send(Buffer.from(response.body))
                } else {
                    reply.send()
                }
            } else if (response.ws) {
                // Send message to device editor websocket
                const wsSocket = tunnel.forwardedWS[response.id]
                wsSocket.send(response.body)
            } else {
                // TODO: remove/change temp debug
                console.warn('device editor websocket message has no reply')
            }
        })

        tunnel.socket.on('close', () => {
            manager.removeTunnel(deviceId)
        })

        /** @type {httpHandler} */
        tunnel._handleHTTPGet = (request, reply) => {
            const id = tunnel.counter++
            tunnel.requests[id] = reply
            tunnel.socket.send(JSON.stringify({
                id,
                method: 'GET',
                headers: request.headers,
                url: request.url.substring(`/api/v1/remote/editor/${tunnel.deviceId}`.length)
            }))
        }

        tunnel._handleHTTP = (request, reply) => {
            if (request.method === 'GET') {
                tunnel._handleHTTPGet(request, reply)
                return
            }
            const requestId = tunnel.counter++
            tunnel.requests[requestId] = reply
            tunnel.socket.send(JSON.stringify({
                id: requestId,
                method: request.method,
                headers: request.headers,
                url: request.url.substring(`/api/v1/remote/editor/${tunnel.deviceId}`.length),
                body: request.body ? JSON.stringify(request.body) : undefined
            }))
        }

        tunnel._handleWS = (connection, request) => {
            const requestId = tunnel.counter++
            tunnel.socket.send(JSON.stringify({
                id: requestId,
                ws: true,
                url: '/comms'
            }))
            /** @type {WebSocket} */
            const wsToDevice = connection.socket
            tunnel.forwardedWS[requestId] = wsToDevice

            // forward messages from device to client
            wsToDevice.on('message', msg => {
                tunnel.socket.send(JSON.stringify({
                    id: requestId,
                    ws: true,
                    body: msg.toString()
                }))
            })

            connection.on('close', () => {
                if (tunnel.forwardedWS[requestId]) {
                    tunnel.forwardedWS[requestId].close()
                }
                delete tunnel.forwardedWS[requestId]
            })
        }
        return true
    }

    verifyToken (deviceId, token) {
        const tunnel = this.#getTunnel(deviceId)
        if (tunnel) {
            if (token && tunnel.token === token) {
                return true
            }
        }
        return false
    }

    /**
     * Handle the HTTP request for the device
     * @param {String} deviceId Device ID
     * @param {FastifyRequest} request request
     * @param {FastifyReply} reply reply
     */
    handleHTTP (deviceId, request, reply) {
        const tunnel = this.#getTunnel(deviceId)
        const connected = !!(tunnel && tunnel.socket)
        if (connected) {
            tunnel._handleHTTP(request, reply)
            return true // handled
        }
        return false // not handled
    }

    /**
     * Handle the websocket request for the device
     * @param {String} deviceId Device ID
     * @param {WebSocket} connection WebSocket connection
     * @param {FastifyRequest} request request
     */
    handleWS (deviceId, connection, request) {
        const tunnel = this.#getTunnel(deviceId)
        const connected = !!(tunnel && tunnel.socket)
        if (connected) {
            tunnel._handleWS(connection, request)
            return true // handled
        }
        return false // not handled
    }

    /**
     * Create new tunnel manager
     * @param {import("../forge").FastifyInstance} app Fastify app
     * @returns {DeviceTunnelManager}
     * @memberof DeviceTunnelManager
     * @static
     * @method create
     */
    static create (app) {
        return new DeviceTunnelManager(app)
    }
}

/**
 * Create new tunnel
 * @param {String} deviceId Device ID
 * @param {String} token Editor access token
 * @returns {DeviceTunnel}
 * @memberof DeviceTunnelManager
 * @static
 * @method newTunnel
 */
function newTunnel (deviceId, token) {
    const tunnel = {
        deviceId,
        counter: 0,
        socket: null,
        requests: {},
        forwardedWS: {},
        token,
        _handleHTTP: null,
        _handleWS: null
    }
    return tunnel
}

module.exports = {
    DeviceTunnelManager
}
