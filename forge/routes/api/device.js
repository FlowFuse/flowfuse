// eslint-disable-next-line no-unused-vars
const { DeviceTunnelManager } = require('../../comms/DeviceTunnelManager')
const { generateToken } = require('../../db/utils')
const { Roles } = require('../../lib/roles')
const DeviceLive = require('./deviceLive')

/**
 * Project Device api routes
 *
 * - /api/v1/devices
 *
 * @namespace devices
 * @memberof forge.routes.api
 */
module.exports = async function (app) {
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
                    }
                } catch (err) {
                    reply.code(404).send({ code: 'not_found', error: 'Not Found' })
                }
            } else {
                reply.code(404).send({ code: 'not_found', error: 'Not Found' })
            }
        }
    })

    app.register(DeviceLive, { prefix: '/:deviceId/live' })

    /**
     * Get a list of all devices
     * Admin-only
     * @name /api/v1/devices/
     * @static
     * @memberof forge.routes.api.devices
     */
    app.get('/', {
        preHandler: app.needsPermission('device:list')
    }, async (request, reply) => {
        const paginationOptions = app.getPaginationOptions(request)
        const devices = await app.db.models.Device.getAll(paginationOptions)
        devices.devices = devices.devices.map(d => app.db.views.Device.device(d))
        reply.send(devices)
    })

    /**
     * Get the details of a device
     * @name /api/v1/devices/:id
     * @static
     * @memberof forge.routes.api.devices
     */
    app.get('/:deviceId', {
        preHandler: app.needsPermission('device:read')
    }, async (request, reply) => {
        reply.send(app.db.views.Device.device(request.device))
    })

    /**
     * Create a device
     * @name /api/v1/devices
     * @static
     * @memberof forge.routes.api.devices
     */
    app.post('/', {
        preHandler: [
            async (request, reply) => {
                // * If this is a Device Provisioning action: verify the device has the required scope
                //   & session has been populated with provisioning data
                // * If this is a User action: verify the user has the required role
                if (request.session.provisioning) {
                    // A device is auto-provisioning. First check the request body team matches the token
                    // NOTE: If the token was not valid, the request would have been rejected by
                    // the verifySession decorator & request.session.provisioning would not be populated
                    const teamOK = request.body.team && request.body.team === request.session.provisioning.team
                    if (teamOK) {
                        const hasPermission = app.needsPermission('device:provision')
                        try {
                            hasPermission(request, reply)
                            return // Request has permission
                        } catch (error) {
                            return // Request does not have permission (error will be sent by needsPermission)
                        }
                    }
                } else if (request.body?.team && request.session.User) {
                    // User action: check if the user is in the team and has the required role
                    request.teamMembership = await request.session.User.getTeamMembership(request.body.team)
                    const hasPermission = app.needsPermission('device:create')
                    try {
                        hasPermission(request, reply)
                        return // Request has permission
                    } catch (error) {
                        return // Request does not have permission (error will be sent by needsPermission)
                    }
                }
                reply.code(401).send({ code: 'unauthorized', error: 'unauthorized' })
            }
        ],
        schema: {
            body: {
                type: 'object',
                required: ['name', 'team'],
                properties: {
                    name: { type: 'string' },
                    type: { type: 'string' },
                    team: { type: 'string' }
                }
            }
        }
    }, async (request, reply) => {
        const provisioningMode = !!request.session.provisioning
        let team, project
        // Additional checks. (initial membership/team/token checks done in preHandler and auth verifySession decorator)
        if (provisioningMode) {
            team = await app.db.models.Team.byId(request.session.provisioning.team)
            if (!team) {
                reply.code(400).send({ code: 'invalid_team', error: 'Invalid team' })
                return
            }
            if (request.session.provisioning.project) {
                project = await app.db.models.Project.byId(request.session.provisioning.project)
                if (!project) {
                    reply.code(400).send({ code: 'invalid_project', error: 'Invalid project' })
                    return
                }
                const projectTeam = await project.getTeam()
                if (projectTeam.id !== team.id) {
                    reply.code(400).send({ code: 'invalid_project', error: 'Invalid project' })
                    return
                }
            }
        } else {
            // Assume membership is enough to allow project creation.
            // If we have roles that limit creation, that will need to be checked here.
            if (!request.teamMembership) {
                reply.code(401).send({ code: 'unauthorized', error: 'Current user not in team ' + request.body.team })
                return
            }
            const teamMembership = await request.session.User.getTeamMembership(request.body.team, true)
            team = teamMembership.get('Team')
        }

        await team.reload({
            include: [
                { model: app.db.models.TeamType }
            ]
        })
        const teamDeviceLimit = team.TeamType.getProperty('deviceLimit')
        if (typeof teamDeviceLimit === 'number') {
            const currentDeviceCount = await team.deviceCount()
            if (currentDeviceCount >= teamDeviceLimit) {
                reply.code(400).send({ code: 'device_limit_reached', error: 'Team device limit reached' })
                return
            }
        }

        try {
            const actionedBy = provisioningMode ? 'system' : request.session.User
            const device = await app.db.models.Device.create({
                name: request.body.name,
                type: request.body.type,
                credentialSecret: ''
            })

            try {
                await team.addDevice(device)

                await device.reload({
                    include: [
                        { model: app.db.models.Team }
                    ]
                })

                const credentials = await device.refreshAuthTokens()
                await app.auditLog.Team.team.device.created(actionedBy, null, team, device)

                // When device provisioning: if a project was specified, add the device to the project
                if (provisioningMode && project) {
                    await assignDeviceToProject(device, project)
                    await device.save()
                    await device.reload({
                        include: [
                            { model: app.db.models.Project }
                        ]
                    })
                    await app.auditLog.Team.team.device.assigned(actionedBy, null, device.Team, device.Project, device)
                    await app.auditLog.Project.project.device.assigned(actionedBy, null, device.Project, device)
                }
                const response = app.db.views.Device.device(device)
                response.credentials = credentials
                reply.send(response)
            } finally {
                if (app.license.active() && app.billing) {
                    await app.billing.updateTeamDeviceCount(team)
                }
            }
        } catch (err) {
            reply.code(400).send({ code: 'unexpected_error', error: err.toString() })
        }
    })

    /**
     * Delete a device
     * @name /api/v1/devices
     * @static
     * @memberof forge.routes.api.devices
     */
    app.delete('/:deviceId', {
        preHandler: app.needsPermission('device:delete')
    }, async (request, reply) => {
        try {
            const team = request.device.get('Team')
            await team.reload({
                include: [
                    { model: app.db.models.TeamType }
                ]
            })
            await request.device.destroy()
            await app.auditLog.Team.team.device.deleted(request.session.User, null, team, request.device)
            if (app.license.active() && app.billing) {
                await app.billing.updateTeamDeviceCount(team)
            }
            reply.send({ status: 'okay' })
        } catch (err) {
            reply.code(400).send({ code: 'unexpected_error', error: err.toString() })
        }
    })

    /**
     * Update a device
     * @name /api/v1/devices
     * @static
     * @memberof forge.routes.api.devices
     */
    app.put('/:deviceId', {
        preHandler: app.needsPermission('device:edit')
    }, async (request, reply) => {
        let sendDeviceUpdate = false
        const device = request.device
        if (request.body.project !== undefined) {
            // ### Add/Remove device to/from project ###

            if (request.body.project === null) {
                // ### Remove device from project ###

                if (device.Project !== null) {
                    const oldProject = device.Project
                    // unassign from project
                    await device.setProject(null)
                    // Clear its target snapshot, so the next time it calls home
                    // it will stop the current snapshot
                    await device.setTargetSnapshot(null)
                    sendDeviceUpdate = true

                    await app.auditLog.Team.team.device.unassigned(request.session.User, null, request.device?.Team, oldProject, request.device)
                    await app.auditLog.Project.project.device.unassigned(request.session.User, null, oldProject, request.device)
                } else {
                    // project is already unassigned - nothing to do
                }
            } else {
                // ### Add device to project ###

                // Update includes a project id?
                if (device.Project?.id === request.body.project) {
                    // Project is already assigned to this project - nothing to do
                } else {
                    // Check if the specified project is in the same team
                    const project = await app.db.models.Project.byId(request.body.project)
                    if (!project) {
                        reply.code(400).send({ code: 'invalid_project', error: 'invalid project' })
                        return
                    }
                    if (project.Team.id !== device.Team.id) {
                        reply.code(400).send({ code: 'invalid_project', error: 'invalid project' })
                        return
                    }
                    // Project exists and is in the right team - assign it to the project
                    sendDeviceUpdate = await assignDeviceToProject(device, project)
                    await app.auditLog.Team.team.device.assigned(request.session.User, null, device.Team, project, request.device)
                    await app.auditLog.Project.project.device.assigned(request.session.User, null, project, request.device)
                }
            }
        } else {
            // ### Modify device properties ###
            let changed = false
            const updates = new app.auditLog.formatters.UpdatesCollection()
            if (request.body.name !== undefined && request.body.name !== device.name) {
                updates.push('name', device.name, request.body.name)
                device.name = request.body.name
                sendDeviceUpdate = true
                changed = true
            }
            if (request.body.type !== undefined && request.body.type !== device.type) {
                updates.push('type', device.type, request.body.type)
                device.type = request.body.type
                sendDeviceUpdate = true
                changed = true
            }
            if (changed) {
                await app.auditLog.Team.team.device.updated(request.session.User, null, device.Team, request.device, updates)
            }
        }
        await device.save()

        const updatedDevice = await app.db.models.Device.byId(device.id)
        if (sendDeviceUpdate) {
            app.db.controllers.Device.sendDeviceUpdateCommand(updatedDevice)
        }
        reply.send(app.db.views.Device.device(updatedDevice))
    })

    app.post('/:deviceId/generate_credentials', {
        preHandler: app.needsPermission('device:edit')
    }, async (request, reply) => {
        const credentials = await request.device.refreshAuthTokens()
        app.auditLog.Team.team.device.credentialsGenerated(request.session.User, null, request.device?.Team, request.device)
        reply.send(credentials)
    })

    app.put('/:deviceId/settings', {
        preHandler: app.needsPermission('device:edit-env')
    }, async (request, reply) => {
        if (request.teamMembership?.role === Roles.Owner) {
            await request.device.updateSettings(request.body)
        } else {
            const bodySettingsEnvOnly = {
                env: request.body.env
            }
            await request.device.updateSettings(bodySettingsEnvOnly)
        }
        app.db.controllers.Device.sendDeviceUpdateCommand(request.device)
        reply.send({ status: 'okay' })
    })

    app.get('/:deviceId/settings', {
        preHandler: app.needsPermission('device:read')
    }, async (request, reply) => {
        const settings = await request.device.getAllSettings()
        if (request.teamMembership?.role === Roles.Owner) {
            reply.send(settings)
        } else {
            reply.send({
                env: settings?.env
            })
        }
    })

    app.get('/:deviceId/logs', {
        websocket: true,
        preHandler: app.needsPermission('device:read')
    }, async (connection, request) => {
        const team = await app.db.models.Team.byId(request.device.TeamId)
        app.comms.devices.streamLogs(team.hashid, request.device.hashid, connection.socket)
    })

    /**
     * Enable/Disable device editor
     * @name /api/v1/devices/:deviceId/editor
     * @memberof module:forge/routes/api/device
     */
    app.put('/:deviceId/editor', {
        preHandler: app.needsPermission('device:editor')
    }, async (request, reply) => {
        const mode = request.body.tunnel || 'disable'
        const team = await app.db.models.Team.byId(request.device.TeamId)
        /** @type {DeviceTunnelManager} */
        const tunnelManager = app.comms.devices.tunnelManager
        const deviceId = request.device.hashid
        const teamId = team.hashid
        if (mode === 'enable') {
            // Generate a random access token for editor, open a tunnel and start the editor
            const accessToken = await generateToken(16, `ffde_${deviceId}`)
            // prepare the tunnel but dont start it (the remote device will initiate the connection)
            // * Enable Device Editor (Step 3) - (frontendApi:HTTP->forge) Create Tunnel
            tunnelManager.newTunnel(deviceId, accessToken)
            let err = null
            try {
                // * Enable Device Editor (Step 4) - (forge) Enable Editor Request. This call resolves after steps 5 ~ 10
                await app.comms.devices.enableEditor(teamId, request.device.hashid, accessToken)
            } catch (error) {
                // ensure any attempt to enable the editor is cleaned up if an error occurs
                tunnelManager.closeTunnel(deviceId)
                err = error
            }
            // * Enable Device Editor (Step 11) - (forge:HTTP->frontendApi) Send tunnel status back to frontend
            const tunnelStatus = tunnelManager.getTunnelStatus(request.device)
            if (err) {
                tunnelStatus.error = err.message
                tunnelStatus.code = err.code || 'enable_editor_failed'
                reply.code(503).send(tunnelStatus) // Service Unavailable
            } else {
                reply.send(tunnelStatus)
            }
        } else if (mode === 'disable') {
            await app.comms.devices.disableEditor(teamId, deviceId)
            tunnelManager.closeTunnel(deviceId)
            reply.send(tunnelManager.getTunnelStatus(request.device))
        } else {
            reply.code(400).send({ code: 'invalid_request', error: 'Expected device editor tunnel mode option to be either "enabled" or "disabled"' })
        }
    })

    /**
     * Get device editor state and url
     * @name /api/v1/devices/:deviceId/editor
     * @memberof module:forge/routes/api/device
     */
    app.get('/:deviceId/editor', async (request, reply) => {
        /** @type {DeviceTunnelManager} */
        const tunnelManager = app.comms.devices.tunnelManager
        reply.send(tunnelManager.getTunnelStatus(request.device))
    })

    /**
     * Set device operating mode
     * @name /api/v1/devices/:deviceId/mode
     * @memberof module:forge/routes/api/device
     */
    app.put('/:deviceId/mode', {
        preHandler: app.needsPermission('device:change-mode')
    }, async (request, reply) => {
        const mode = request.body.mode || 'autonomous'
        if (mode !== 'autonomous' && mode !== 'developer') {
            reply.code(400).send({ code: 'invalid_mode', error: 'Expected device mode option to be either "autonomous" or "developer"' })
            return
        }
        request.device.mode = request.body.mode
        await request.device.save()
        reply.send({ mode: request.body.mode })
    })

    /**
     * Create a snapshot from a device
     * @name /api/v1/devices/:deviceId/snapshot
     * @memberof module:forge/routes/api/device
     */
    app.post('/:deviceId/snapshot', {
        preHandler: app.needsPermission('project:snapshot:create')
    }, async (request, reply) => {
        const snapshotOptions = {
            name: request.body.name,
            description: request.body.description,
            setAsTarget: request.body.setAsTarget
        }
        const snapShot = await app.db.controllers.ProjectSnapshot.createSnapshotFromDevice(
            request.device.Project,
            request.device,
            request.session.User,
            snapshotOptions
        )
        snapShot.User = request.session.User
        await app.auditLog.Project.project.snapshot.created(request.session.User, null, request.project, snapShot)
        if (request.body.setAsTarget) {
            await snapShot.reload()
            await request.project.updateSetting('deviceSettings', {
                targetSnapshot: snapShot.id
            })
            // Update the targetSnapshot of the devices assigned to this project
            await app.db.models.Device.update({ targetSnapshotId: snapShot.id }, {
                where: {
                    ProjectId: request.project.id
                }
            })
            await app.auditLog.Project.project.snapshot.deviceTargetSet(request.session.User, null, request.project, snapShot)
            if (app.comms) {
                app.comms.devices.sendCommandToProjectDevices(request.project.Team.hashid, request.project.id, 'update', {
                    snapshot: snapShot.hashid
                })
            }
        }
        reply.send(app.db.views.ProjectSnapshot.snapshot(snapShot))
    })

    async function assignDeviceToProject (device, project) {
        await device.setProject(project)
        // Set the target snapshot to match the project's one
        const deviceSettings = await project.getSetting('deviceSettings')
        device.targetSnapshotId = deviceSettings?.targetSnapshot
        return true
    }
    // #endregion
}
