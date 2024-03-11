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
        if (!!request.device.editorToken === mode) {
            // if this request is to `enable` tunnel and the tunnel is already enabled, return the current state
            // however, if it is not `connected`, then we need to refresh the tunnel
            if (mode === true) {
                // close any existing tunnel from this side
                // then skip through to the next block of code to permit the connection to be refreshed
                tunnelManager.closeTunnel(deviceId)
            } else {
                reply.send(tunnelManager.getTunnelStatus(request.device))
                return
            }
        }

        if (mode) {
            // Generate an access token for the device and store on the Device object itself.
            // The format of the token (ffde_<deviceHash>_<random>) is required by the Device Agent - do not change it
            request.device.editorToken = generateToken(16, `ffde_${request.device.hashid}`)
            await request.device.save()
            let err = null
            try {
                // * Enable Device Editor (Step 4) - (forge) Enable Editor Request. This call resolves after steps 5 ~ 10
                const cmdResponse = await app.comms.devices.enableEditor(teamId, deviceId, request.device.editorToken)
                if (cmdResponse.error) {
                    throw new Error('No Node-RED running on Device')
                }
                // The device tells us what affinity cookie it received (if any)
                if (cmdResponse.affinity) {
                    request.device.editorAffinity = cmdResponse.affinity
                    await request.device.save()
                }
            } catch (error) {
                request.device.editorToken = ''
                await request.device.save()
                err = error
            }
            await request.device.reload()
            // * Enable Device Editor (Step 11) - (forge:HTTP->frontendApi) Send tunnel status back to frontend
            const tunnelStatus = tunnelManager.getTunnelStatus(request.device) || {}
            if (err) {
                tunnelStatus.error = err.message
                tunnelStatus.code = err.code || 'enable_editor_failed'
                await app.auditLog.Team.team.device.remoteAccess.enabled(request.session.User, tunnelStatus, team, request.device)
                await app.auditLog.Device.device.remoteAccess.enabled(request.session.User, tunnelStatus, request.device)
                reply.code(503).send(tunnelStatus) // Service Unavailable
            } else {
                await app.auditLog.Team.team.device.remoteAccess.enabled(request.session.User, null, team, request.device)
                await app.auditLog.Device.device.remoteAccess.enabled(request.session.User, null, request.device)
                reply.send(tunnelStatus)
            }
        } else if (!mode) {
            request.device.editorToken = ''
            request.device.editorAffinity = ''
            await request.device.save()
            await app.comms.devices.disableEditor(teamId, deviceId)
            tunnelManager.closeTunnel(deviceId)
            await app.auditLog.Team.team.device.remoteAccess.disabled(request.session.User, null, team, request.device)
            await app.auditLog.Device.device.remoteAccess.disabled(request.session.User, null, request.device)
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
        reply.send(tunnelManager.getTunnelStatus(request.device))
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
    }, (request, reply) => {
        if (request.device.editorToken === request.headers['x-access-token']) {
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
    }, async (connection, request) => {
        // This is the inbound websocket connection from the device
        const token = request.params.access_token
        if (request.device.editorToken) {
            if (token === request.device.editorToken) {
                const tunnelManager = getTunnelManager()
                const tunnel = tunnelManager.getTunnel(request.device.hashid)
                if (!tunnel) {
                    // Create the tunnel object
                    tunnelManager.newTunnel(request.device.hashid, request.device.editorToken)
                }
                const tunnelSetupOK = await tunnelManager.initTunnel(request.device, connection)
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
                    const status = getTunnelManager().getTunnelStatus(request.device)
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
            } else if (tunnelManager.getTunnelStatus(request.device)?.enabled) {
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
                    const status = getTunnelManager().getTunnelStatus(request.device)
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
            } else if (tunnelManager.getTunnelStatus(request.device)?.enabled) {
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
