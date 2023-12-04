const { generateToken } = require('../../../db/utils')
const { registerPermissions } = require('../../../lib/permissions')
const { Roles } = require('../../../lib/roles.js')

/**
 * Routes releated to the EE forge api
 * @param {import('../../forge').ForgeApplication} app - forge application
 * @namespace api
 * @memberof forge.ee
 */
module.exports = async function (app) {
    if (!app.comms) {
        return
    }
    registerPermissions({
        'device:editor': { description: 'Access the Device Editor', role: Roles.Member }
    })

    /**
     * Add wildcard content parser for these routes
     */
    app.addContentTypeParser('*', (req, payload, done) => {
        let data = ''
        payload.on('data', chunk => { data += chunk })
        payload.on('end', () => {
            done(null, data)
        })
    })

    app.addHook('preHandler', app.verifySession)
    app.addHook('preHandler', async (request, reply) => {
        if (request.params.deviceId !== undefined) {
            if (request.params.deviceId) {
                try {
                    request.device = await app.db.models.Device.byId(request.params.deviceId)
                    if (!request.device) {
                        reply.code(404).send({ code: 'not_found', error: 'Not Found' })
                        return
                    }
                    if (request.session.User) {
                        request.teamMembership = await request.session.User.getTeamMembership(request.device.Team.id)
                        // If the user isn't in the team, only give 404 error if this
                        // is not a 'allowAnonymous' route. This allows the proxy routes
                        // to return a redirect for this auth fail rather than an API error
                        if (!request.routeOptions.config.allowAnonymous && !request.teamMembership && !request.session.User.admin) {
                            reply.code(404).send({ code: 'not_found', error: 'Not Found' })
                            return // eslint-disable-line no-useless-return
                        }
                    }
                } catch (err) {
                    reply.code(404).send({ code: 'not_found', error: 'Not Found' })
                }
            } else {
                reply.code(404).send({ code: 'not_found', error: 'Not Found' })
            }
        }
    })
    /**
     * Enable/Disable device editor
     * @name /api/v1/devices/:deviceId/editor
     * @memberof module:forge/routes/api/device
     */
    app.put('/', {
        preHandler: app.needsPermission('device:editor'),
        config: { rateLimit: false }, // never rate limit this route
        schema: {
            params: {
                type: 'object',
                properties: {
                    deviceId: { type: 'string' }
                }
            },
            body: {
                type: 'object',
                properties: {
                    enabled: { type: 'boolean' }
                },
                required: ['enabled']
            }
        }
    }, async (request, reply) => {
        const mode = request.body.enabled
        const team = await app.db.models.Team.byId(request.device.TeamId)
        const tunnelManager = getTunnelManager()
        const deviceId = request.device.hashid
        const teamId = team.hashid

        const currentState = tunnelManager.getTunnelStatus(deviceId)
        if (currentState.enabled === mode) {
            // if this request is to `enable` tunnel and the tunnel is already enabled, return the current state
            // however, if it is not `connected`, then we need to refresh the tunnel
            if (mode === true && currentState.connected === false) {
                // close any existing tunnel from this side
                // then skip through to the next block of code to permit the connection to be refreshed
                tunnelManager.closeTunnel(deviceId)
            } else {
                reply.send(currentState)
                return
            }
        }

        if (mode) {
            // Generate a random access token for editor, open a tunnel and start the editor
            const accessToken = await generateToken(16, `ffde_${deviceId}`)
            // prepare the tunnel but dont start it (the remote device will initiate the connection)
            // * Enable Device Editor (Step 3) - (frontendApi:HTTP->forge) Create Tunnel
            tunnelManager.newTunnel(deviceId, accessToken)
            let err = null
            try {
                // * Enable Device Editor (Step 4) - (forge) Enable Editor Request. This call resolves after steps 5 ~ 10
                const cmdResponse = await app.comms.devices.enableEditor(teamId, deviceId, accessToken)
                if (cmdResponse.error) {
                    throw new Error('No Node-RED running on Device')
                }
            } catch (error) {
                // ensure any attempt to enable the editor is cleaned up if an error occurs
                tunnelManager.closeTunnel(deviceId)
                err = error
            }
            // * Enable Device Editor (Step 11) - (forge:HTTP->frontendApi) Send tunnel status back to frontend
            const tunnelStatus = tunnelManager.getTunnelStatus(deviceId) || {}
            if (err) {
                tunnelStatus.error = err.message
                tunnelStatus.code = err.code || 'enable_editor_failed'
                await app.auditLog.Team.team.device.remoteAccess.enabled(request.session.User, tunnelStatus, team, request.device)
                reply.code(503).send(tunnelStatus) // Service Unavailable
            } else {
                await app.auditLog.Team.team.device.remoteAccess.enabled(request.session.User, null, team, request.device)
                reply.send(tunnelStatus)
            }
        } else if (!mode) {
            await app.comms.devices.disableEditor(teamId, deviceId)
            tunnelManager.closeTunnel(deviceId)
            await app.auditLog.Team.team.device.remoteAccess.disabled(request.session.User, null, team, request.device)
            reply.send({ enabled: false })
        }
    })

    /**
     * Get device editor state and url
     * @name /api/v1/devices/:deviceId/editor
     * @memberof module:forge/routes/api/device
     */
    app.get('/', {
        preHandler: app.needsPermission('device:editor'),
        config: { rateLimit: false } // never rate limit this route
    }, async (request, reply) => {
        const tunnelManager = getTunnelManager()
        reply.send(tunnelManager.getTunnelStatus(request.device.hashid))
    })

    /**
     * HTTP GET: verify adminAuth token
     * As this will be called by NR auth, this endpoint cannot be protected by the
     * normal forge auth middleware
     * @name /api/v1/devices/:deviceId/editor/token
     */
    app.get('/token', {
        config: {
            allowAnonymous: true,
            rateLimit: false // never rate limit this route
        }
    }, async (request, reply) => {
        const tunnelManager = getTunnelManager()
        if (tunnelManager.verifyToken(request.params.deviceId, request.headers['x-access-token'])) {
            reply.code(200).send({ username: 'forge', permissions: '*' })
            return
        }
        reply.code(401).send({ code: 'unauthorized', error: 'unauthorized' })
    })

    /**
     * End-point used by devices to create their websocket tunnel back to the
     * platform
     * @name /api/v1/devices/:deviceId/editor/comms/:access_token
     */
    app.get('/comms/:access_token', {
        config: {
            allowAnonymous: true,
            rateLimit: false // never rate limit this route
        },
        websocket: true
    }, (connection, request) => {
        // * Enable Device Editor (Step 9) - (device:WS->forge) websocket connect request from device
        // This is the inbound websocket connection from the device
        const deviceId = request.params.deviceId
        const token = request.params.access_token
        const tunnelManager = getTunnelManager()
        const tunnelInfo = tunnelManager.getTunnelStatus(deviceId)
        if (tunnelInfo && tunnelInfo.enabled) {
            if (tunnelManager.verifyToken(deviceId, token)) {
                const tunnelSetupOK = tunnelManager.initTunnel(deviceId, token, connection)
                if (!tunnelSetupOK) {
                    connection.socket.close(4000, 'Tunnel setup failed')
                }
            } else {
                connection.socket.close(4001, 'Invalid token')
            }
        } else {
            connection.socket.close(4004, 'No tunnel')
        }
    })

    /**
     * HTTP GET and WS requests from device
     * @name /api/v1/devices/:deviceId/editor/proxy/*
     */
    app.route({
        method: 'GET', // only GET is permitted for WS
        url: '/proxy/*',
        // By default, fastify adds a HEAD route for each GET route. Given
        // we want our own HEAD route handler, we tell fastify not to do it here.
        exposeHeadRoute: false,
        // Set 'allowAnonymous' as we don't want to return the standard API
        // response object. Instead, we will use the preHandler to detect
        // there's no session user and redirect to the device overview
        config: {
            allowAnonymous: true,
            rateLimit: false // never rate limit this route
        },
        preHandler: async (request, reply) => {
            if (!request.teamMembership) {
                // Failed authentication. Redirect to the device overview page
                reply.redirect(303, '/')
            } else if (!request.session?.User) {
                // Failed authentication. Redirect to the device overview page
                reply.redirect(303, `/device/${request.params.deviceId}/overview`)
            } else {
                // For a websocket comms request
                if (/\/comms$/.test(request.url)) {
                    const status = getTunnelManager().getTunnelStatus(request.params.deviceId)
                    if (!status?.connected) {
                        reply.code(502).send('The connection to the editor is currently unavailable')
                    }
                }
            }
        },
        helmet: false,
        handler: (request, reply) => {
            // Handle HTTP GET requests from the device
            const tunnelManager = getTunnelManager()
            if (tunnelManager.handleHTTP(request.params.deviceId, request, reply)) {
                return
            } else if (tunnelManager.getTunnelStatus(request.params.deviceId)?.enabled) {
                // Enabled, but not connected
                reply.code(502).send('The connection to the editor is currently unavailable') // Bad Gateway (tunnel exists but it has lost connection or is in an intermediate state)
                return
            }
            // tunnel does not exist
            reply.code(503).send('The editor is not currently enabled for this device') // Service Unavailable
        },
        wsHandler: (connection, request) => {
            // Handle WS connection from the device
            const tunnelManager = getTunnelManager()
            if (tunnelManager.handleWS(request.params.deviceId, connection, request)) {
                return // handled
            }
            // not handled
            connection.socket.close(4000, 'No tunnel established')
        }
    })

    /**
     * HTTP POST, DELETE, PUT requests from device
     * @name/api/v1/devices/:deviceId/editor/proxy/*
     */
    app.route({
        method: ['POST', 'DELETE', 'PUT', 'HEAD', 'OPTIONS'],
        url: '/proxy/*',
        config: {
            allowAnonymous: true,
            rateLimit: false // never rate limit this route
        },
        preHandler: async (request, reply) => {
            if (!request.teamMembership) {
                // Failed authentication. Redirect to the device overview page
                reply.redirect(303, '/')
            } else if (!request.session?.User) {
                // Failed authentication. Redirect to the device overview page
                reply.redirect(303, `/device/${request.params.deviceId}/overview`)
            } else {
                // For a websocket comms request
                if (/\/comms$/.test(request.url)) {
                    const status = getTunnelManager().getTunnelStatus(request.params.deviceId)
                    if (!status?.connected) {
                        reply.code(502).send('The connection to the editor is currently unavailable')
                    }
                }
            }
        },
        helmet: false,
        handler: (request, reply) => {
            const tunnelManager = getTunnelManager()
            if (tunnelManager.handleHTTP(request.params.deviceId, request, reply)) {
                return // handled
            } else if (tunnelManager.getTunnelStatus(request.params.deviceId)?.enabled) {
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
     * @returns {import('../../lib/deviceEditor/DeviceTunnelManager').DeviceTunnelManager}
     */
    function getTunnelManager () {
        return app.comms.devices.tunnelManager
    }
    // #endregion
}
