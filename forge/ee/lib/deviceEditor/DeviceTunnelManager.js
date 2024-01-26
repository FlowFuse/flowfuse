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
 * @property {numner} id - A unique identifier for this tunnel instance
 * @property {string} deviceId - Device ID
 * @property {number} nextRequestId - Next available request id
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
 * @typedef {import('../../../forge').ForgeApplication} ForgeApplication
 * @typedef {import('../../../forge').FastifyRequest} FastifyRequest
 * @typedef {import('../../../forge').FastifyReply} FastifyReply
 * @typedef {(request: FastifyRequest, reply: FastifyReply) => void} httpHandler
 * @typedef {(connection: WebSocket, request: FastifyRequest) => void} wsHandler
 */

class DeviceTunnelManager {
    // private members
    /** @type {Map<String, DeviceTunnel>} */ #tunnels

    /**
     * Create a new DeviceTunnelManager
     * @param {ForgeApplication} app Forge application (Fastify app)
     * @constructor
     * @memberof module:comms
     * @alias DeviceTunnelManager
     */
    constructor (app) {
        /** @type {ForgeApplication}  Forge application (Fastify app) */
        this.app = app
        this.#tunnels = new Map()

        this.app.addHook('onClose', async (_) => {
            Object.keys(this.#tunnels).forEach(deviceId => {
                this.closeTunnel(deviceId)
            })
        })
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
     */
    newTunnel (deviceId, token) {
        const manager = this

        // ensure existing tunnel is closed
        manager.closeTunnel(deviceId)

        // create a new tunnel object & add to list
        manager.#tunnels.set(deviceId, createNewTunnel(deviceId, token))

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
        if (!exists) {
            return { enabled: false }
        }
        const url = this.getTunnelUrl(deviceId)
        const enabled = this.isEnabled(deviceId)
        const connected = this.isConnected(deviceId)
        return { url, enabled, connected, affinity: this.#getTunnel(deviceId)?.affinity }
    }

    closeTunnel (deviceId) {
        const tunnel = this.#getTunnel(deviceId)
        if (tunnel) {
            tunnel.socket?.close()
            // Close all of the editor websockets that were using this tunnel
            Object.keys(tunnel?.forwardedWS).forEach(reqId => {
                const wsClient = tunnel.forwardedWS[reqId]
                wsClient.close()
            })
        }
        if (this.#tunnels.has(deviceId)) {
            return this.#tunnels.delete(deviceId)
        }
    }

    getTunnelUrl (deviceId) {
        const tunnel = this.#getTunnel(deviceId)
        if (tunnel) {
            return `/api/v1/devices/${deviceId}/editor/proxy/?access_token=${tunnel.token}`
        }
        return ''
    }

    setTunnelAffinity (deviceId, affinity) {
        const tunnel = this.#getTunnel(deviceId)
        if (tunnel) {
            tunnel.affinity = affinity
        }
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

        // Close any existing tunnel
        if (tunnel.socket) {
            tunnel.socket.close()
        }
        tunnel.socket = inboundDeviceConnection.socket

        // Handle messages sent from the device
        tunnel.socket.on('message', msg => {
            const response = JSON.parse(msg.toString())
            if (response.id === undefined) {
                return
            }
            // See if we have a reply for this incoming message. If so, send it to the device.
            // Otherwise, it's a websocket message, so forward it to the device editor websocket
            const reply = tunnel.requests[response.id]
            if (reply) {
                delete tunnel.requests[response.id]
                reply.headers(response.headers ? response.headers : {})
                reply.code(response.status)
                if (response.body) {
                    reply.send(Buffer.from(response.body))
                } else {
                    reply.send()
                }
            } else if (response.ws) {
                const wsSocket = tunnel.forwardedWS[response.id]
                if (wsSocket) {
                    if (response.closed) {
                        // The runtime has closed this session's websocket on the device
                        // Pass that back to the editor so it knows something is up
                        if (wsSocket) {
                            wsSocket.close()
                        }
                        delete tunnel.forwardedWS[response.id]
                    } else {
                        // Send message to device editor websocket
                        wsSocket.send(response.body)
                    }
                } else {
                    // This is a message for a editor we don't know about.
                    // This can happen with Device Agent <= 1.9.4 if multiple
                    // editors were opened in a single session and then one
                    // of them is closed. Older Agents don't know to disconnect
                    // their local comms link for the closed editor, so continue
                    // sending messages to everyone who was ever connected
                }
            } else {
                // TODO: remove/change temp debug
                console.warn('device editor websocket message has no reply')
            }
        })

        tunnel.socket.on('close', () => {
            // The ws connection from the device has closed.
            delete tunnel.socket

            // Close all of the editor websockets
            for (const [id, wsSocket] of Object.entries(tunnel.forwardedWS)) {
                wsSocket.close()
                delete tunnel.forwardedWS[id]
            }
            this.app.log.info(`Device ${deviceId} tunnel closed. id:${tunnel.id}`)
        })

        /** @type {httpHandler} */
        tunnel._handleHTTPGet = (request, reply) => {
            const id = tunnel.nextRequestId++
            tunnel.requests[id] = reply
            tunnel.socket.send(JSON.stringify({
                id,
                method: request.method,
                headers: request.headers,
                url: request.url.substring(`/api/v1/devices/${tunnel.deviceId}/editor/proxy`.length)
            }))
        }

        tunnel._handleHTTP = (request, reply) => {
            if (request.method === 'GET' || request.method === 'HEAD' || request.method === 'OPTIONS') {
                tunnel._handleHTTPGet(request, reply)
                return
            }
            const requestId = tunnel.nextRequestId++
            tunnel.requests[requestId] = reply
            tunnel.socket.send(JSON.stringify({
                id: requestId,
                method: request.method,
                headers: request.headers,
                url: request.url.substring(`/api/v1/devices/${tunnel.deviceId}/editor/proxy`.length),
                body: request.body ? JSON.stringify(request.body) : undefined
            }))
        }

        tunnel._handleWS = (connection, request) => {
            // A new editor websocket is connecting
            const requestId = tunnel.nextRequestId++
            tunnel.socket.send(JSON.stringify({
                id: requestId,
                ws: true,
                url: '/comms'
            }))
            /** @type {WebSocket} */
            const wsToDevice = connection.socket
            tunnel.forwardedWS[requestId] = wsToDevice

            this.app.log.info(`Device ${deviceId} tunnel id:${tunnel.id} - new editor connection req:${requestId} `)

            wsToDevice.on('message', msg => {
                // Forward messages sent by the editor down to the device
                // console.info(`[${tunnel.id}] [${requestId}] E>R`, msg.toString())
                tunnel.socket.send(JSON.stringify({
                    id: requestId,
                    ws: true,
                    body: msg.toString()
                }))
            })
            wsToDevice.on('close', msg => {
                this.app.log.info(`Device ${deviceId} tunnel id:${tunnel.id} - editor connection closed req:${requestId} `)
                // The editor has closed its websocket. Send notification to the
                // device so it can close its corresponing connection
                // console.info(`[${tunnel.id}] [${requestId}] E>R closed`)
                if (tunnel.forwardedWS[requestId] && tunnel.socket) {
                    // console.info(`[${tunnel.id}] [${requestId}] E>R closed - notifying the device`)
                    tunnel.socket.send(JSON.stringify({
                        id: requestId,
                        ws: true,
                        closed: true
                    }))
                    delete tunnel.forwardedWS[requestId]
                }
            })
        }
        this.app.log.info(`Device ${deviceId} tunnel connected. id:${tunnel.id}`)
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
     * @param {ForgeApplication} app Forge Application (fastify app)
     * @returns {DeviceTunnelManager}
     * @memberof DeviceTunnelManager
     * @static
     * @method create
     */
    static create (app) {
        return new DeviceTunnelManager(app)
    }
}

let tunnelCounter = 0
/**
 * Create new tunnel
 * @param {String} deviceId Device ID
 * @param {String} token Editor access token
 * @returns {DeviceTunnel}
 * @memberof DeviceTunnelManager
 * @static
 * @method createNewTunnel
 */
function createNewTunnel (deviceId, token) {
    const tunnel = {
        id: ++tunnelCounter,
        deviceId,
        nextRequestId: 1,
        socket: null,
        requests: {},
        forwardedWS: {},
        token,
        _handleHTTP: null,
        _handleWS: null,
        affinity: null
    }
    return tunnel
}

module.exports = {
    DeviceTunnelManager
}
