// eslint-disable-next-line no-unused-vars
const { DeviceTunnelManager } = require('../../ee/lib/deviceEditor/DeviceTunnelManager')
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
        preHandler: app.needsPermission('device:list'),
        schema: {
            summary: 'Get a list of all devices - admin-only',
            tags: ['Devices'],
            query: { $ref: 'PaginationParams' },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        meta: { $ref: 'PaginationMeta' },
                        count: { type: 'number' },
                        devices: { type: 'array', items: { $ref: 'Device' } }
                    }
                },
                '4xx': {
                    $ref: 'APIError'
                }
            }
        }
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
        preHandler: app.needsPermission('device:read'),
        schema: {
            summary: 'Get details of a device',
            tags: ['Devices'],
            params: {
                type: 'object',
                properties: {
                    deviceId: { type: 'string' }
                }
            },
            response: {
                200: {
                    $ref: 'Device'
                },
                '4xx': {
                    $ref: 'APIError'
                }
            }
        }
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
            summary: 'Create a device',
            tags: ['Devices'],
            body: {
                type: 'object',
                required: ['name', 'team'],
                properties: {
                    name: { type: 'string' },
                    type: { type: 'string' },
                    team: { type: 'string' }
                }
            },
            response: {
                200: {
                    type: 'object',
                    allOf: [{ $ref: 'Device' }],
                    properties: {
                        credentials: { type: 'object', additionalProperties: true }
                    }
                },
                '4xx': {
                    $ref: 'APIError'
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
                    reply.code(400).send({ code: 'invalid_instance', error: 'Invalid instance' })
                    return
                }
                const projectTeam = await project.getTeam()
                if (projectTeam.id !== team.id) {
                    reply.code(400).send({ code: 'invalid_instance', error: 'Invalid instance' })
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
        preHandler: app.needsPermission('device:delete'),
        schema: {
            summary: 'Delete a device',
            tags: ['Devices'],
            params: {
                type: 'object',
                properties: {
                    deviceId: { type: 'string' }
                }
            },
            response: {
                200: {
                    $ref: 'APIStatus'
                },
                '4xx': {
                    $ref: 'APIError'
                }
            }
        }
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
        preHandler: app.needsPermission('device:edit'),
        schema: {
            summary: 'Update a device',
            tags: ['Devices'],
            params: {
                type: 'object',
                properties: {
                    deviceId: { type: 'string' }
                }
            },
            body: {
                type: 'object',
                properties: {
                    name: { type: 'string' },
                    type: { type: 'string' },
                    instance: { type: 'string', nullable: true }
                }
            },
            response: {
                200: {
                    $ref: 'Device'
                },
                '4xx': {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        let sendDeviceUpdate = false
        const device = request.device
        if (request.body.instance !== undefined) {
            // ### Add/Remove device to/from project ###

            if (request.body.instance === null) {
                // ### Remove device from project ###

                if (device.Project !== null) {
                    const oldProject = device.Project
                    // unassign from project
                    await device.setProject(null)
                    // Clear its target snapshot, so the next time it calls home
                    // it will stop the current snapshot
                    await device.setTargetSnapshot(null)
                    sendDeviceUpdate = true

                    // disable developer mode
                    device.mode = 'autonomous'
                    await device.save()

                    await app.auditLog.Team.team.device.unassigned(request.session.User, null, request.device?.Team, oldProject, request.device)
                    await app.auditLog.Project.project.device.unassigned(request.session.User, null, oldProject, request.device)
                } else {
                    // project is already unassigned - nothing to do
                }
            } else {
                // ### Add device to project ###

                // Update includes a project id?
                if (device.Project?.id === request.body.instance) {
                    // Project is already assigned to this project - nothing to do
                } else {
                    // Check if the specified project is in the same team
                    const project = await app.db.models.Project.byId(request.body.instance)
                    if (!project) {
                        reply.code(400).send({ code: 'invalid_instance', error: 'invalid instance' })
                        return
                    }
                    if (project.Team.id !== device.Team.id) {
                        reply.code(400).send({ code: 'invalid_instance', error: 'invalid instance' })
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
        preHandler: app.needsPermission('device:edit'),
        schema: {
            summary: 'Regenerate device credentials',
            tags: ['Devices'],
            params: {
                type: 'object',
                properties: {
                    deviceId: { type: 'string' }
                }
            },
            response: {
                200: {
                    type: 'object',
                    additionalProperties: true
                },
                '4xx': {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        const credentials = await request.device.refreshAuthTokens()
        app.auditLog.Team.team.device.credentialsGenerated(request.session.User, null, request.device?.Team, request.device)
        reply.send(credentials)
    })

    app.put('/:deviceId/settings', {
        preHandler: app.needsPermission('device:edit-env'),
        schema: {
            summary: 'Update a devices settings',
            tags: ['Devices'],
            params: {
                type: 'object',
                properties: {
                    deviceId: { type: 'string' }
                }
            },
            body: {
                type: 'object',
                properties: {
                    env: { type: 'array', items: { type: 'object', additionalProperties: true } }
                }
            },
            response: {
                200: {
                    $ref: 'APIStatus'
                },
                '4xx': {
                    $ref: 'APIError'
                }
            }
        }
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
        preHandler: app.needsPermission('device:read'),
        schema: {
            summary: 'Get a devices settings',
            tags: ['Devices'],
            params: {
                type: 'object',
                properties: {
                    deviceId: { type: 'string' }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        env: { type: 'array', items: { type: 'object', additionalProperties: true } }
                    }
                },
                '4xx': {
                    $ref: 'APIError'
                }
            }
        }
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

    // Websocket end point
    app.get('/:deviceId/logs', {
        websocket: true,
        preHandler: app.needsPermission('device:read')
    }, async (connection, request) => {
        const team = await app.db.models.Team.byId(request.device.TeamId)
        app.comms.devices.streamLogs(team.hashid, request.device.hashid, connection.socket)
    })

    /**
     * Set device operating mode
     * @name /api/v1/devices/:deviceId/mode
     * @memberof module:forge/routes/api/device
     */
    app.put('/:deviceId/mode', {
        preHandler: app.needsPermission('device:edit'),
        schema: {
            summary: 'Set device mode',
            tags: ['Devices'],
            params: {
                type: 'object',
                properties: {
                    deviceId: { type: 'string' }
                }
            },
            body: {
                type: 'object',
                properties: {
                    mode: { type: 'string', nullable: true }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        mode: { type: 'string' }
                    }
                },
                '4xx': {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        // setting device mode is only valid for licensed platforms
        const isLicensed = app.license.active()
        if (isLicensed !== true) {
            reply.code(400).send({ code: 'not_licensed', error: 'Device mode can only be set for licensed platforms' })
            return
        }
        const mode = request.body.mode || 'autonomous'
        if (mode !== 'autonomous' && mode !== 'developer') {
            reply.code(400).send({ code: 'invalid_mode', error: 'Expected device mode option to be either "autonomous" or "developer"' })
            return
        }
        request.device.mode = request.body.mode
        await request.device.save()
        // send update to device for immediate effect
        app.db.controllers.Device.sendDeviceUpdateCommand(request.device)
        // Audit log the change
        if (request.device.mode === 'developer') {
            await app.auditLog.Team.team.device.developerMode.enabled(request.session.User, null, request.device.Team, request.device)
        } else {
            await app.auditLog.Team.team.device.developerMode.disabled(request.session.User, null, request.device.Team, request.device)
        }
        reply.send({ mode: request.body.mode })
    })

    /**
     * Create a snapshot from a device
     * @name /api/v1/devices/:deviceId/snapshot
     * @memberof module:forge/routes/api/device
     */
    app.post('/:deviceId/snapshot', {
        preHandler: app.needsPermission('project:snapshot:create'),
        schema: {
            summary: 'Create a snapshot from a device',
            tags: ['Devices'],
            params: {
                type: 'object',
                properties: {
                    deviceId: { type: 'string' }
                }
            },
            body: {
                type: 'object',
                properties: {
                    name: { type: 'string' },
                    description: { type: 'string' },
                    setAsTarget: { type: 'boolean' }
                }
            },
            response: {
                200: {
                    $ref: 'Snapshot'
                },
                '4xx': {
                    $ref: 'APIError'
                }
            }
        }
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
        await app.auditLog.Project.project.device.snapshot.created(request.session.User, null, request.device.Project, request.device, snapShot)
        if (request.body.setAsTarget) {
            await snapShot.reload()
            await request.device.Project.updateSetting('deviceSettings', {
                targetSnapshot: snapShot.id
            })
            // Update the targetSnapshot of the devices assigned to this project
            await app.db.models.Device.update({ targetSnapshotId: snapShot.id }, {
                where: {
                    ProjectId: request.device.Project.id
                }
            })
            await app.auditLog.Project.project.snapshot.deviceTargetSet(request.session.User, null, request.device.Project, snapShot)
            if (app.comms) {
                app.comms.devices.sendCommandToProjectDevices(request.device.Team.hashid, request.device.Project.id, 'update', {
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
