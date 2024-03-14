// eslint-disable-next-line no-unused-vars
const { DeviceTunnelManager } = require('../../ee/lib/deviceEditor/DeviceTunnelManager')
const { Roles } = require('../../lib/roles')

const DeviceActions = require('./deviceActions')
const DeviceLive = require('./deviceLive')
const DeviceSnapshots = require('./deviceSnapshots.js')
const hasProperty = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key)

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
    app.register(DeviceSnapshots, { prefix: '/:deviceId/snapshots' })
    app.register(DeviceActions, { prefix: '/:deviceId/actions' })

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
        const result = app.db.views.Device.device(request.device)
        // ingress-nginx will set a cookie on /api/v1/devices - which will cannot allow to override
        // that of the device-specific cookie. So clear it out.
        if (request.cookies.FFSESSION) {
            reply.clearCookie('FFSESSION', { path: '/api/v1/devices/' })
        }
        if (result.editor && result.editor.enabled) {
            if (result.editor.connected) {
                if (!result.editor.local) {
                    // This device has the editor enabled, is connected, but not to
                    // this local platform instance. We need to clear the session
                    // cookies so the client gets routed to another platform instance
                    if (request.device.editorAffinity) {
                        // In this case, we *know* the cookie used by the device, so
                        // use that.

                        reply.setCookie('FFSESSION', request.device.editorAffinity, {
                            httpOnly: true,
                            path: request.url,
                            // By default, it will uriEncode the value, which changes | to %7C
                            // We don't want that change to happen, so provide a cleaner
                            // encode function
                            encode: s => s
                        })
                    } else {
                        // An older device agent doesn't tell us about its affinity cookie
                        // So the best we can do is clear the session cookies and have
                        // the load balancer pick another route to try
                        // We have to clear both the top level cookie and the one for
                        // this specific device.
                        reply.clearCookie('FFSESSION', { path: request.url })
                    }
                } else {
                    if (!request.device.editorAffinity && request.cookies.FFSESSION) {
                        // Connected locally. For a legacy device agent, we need to ensure
                        // the affinity cookie, if present, is set on the device-scoped path.
                        reply.setCookie('FFSESSION', request.cookies.FFSESSION, {
                            httpOnly: true,
                            path: request.url,
                            // By default, it will uriEncode the value, which changes | to %7C
                            // We don't want that change to happen, so provide a cleaner
                            // encode function
                            encode: s => s
                        })
                    }
                }
            }
        }
        reply.send(result)
    })

    /**
     * Create a device (including auto-provisioning and setup with One-Time-Code)
     * @name /api/v1/devices
     * @static
     * @memberof forge.routes.api.devices
     */
    app.post('/', {
        preHandler: [
            async (request, reply) => {
                // * If this is a Device Provisioning action: verify the device has the required scope
                //   & session has been populated with provisioning data
                // * If this is a Device setup with a One time code, verify the code is valid and return the credentials
                // * If this is a User action: verify the user has the required role
                if (request.session.provisioning) {
                    if (request.session.provisioning?.otcSetup) {
                        // A request is being made to setup a device using a One-Time-Code.
                        // NOTE: If the token (OTC) was not valid, the request would have been rejected by
                        // the verifySession decorator & request.session.provisioning would not be populated
                        // Essentially, we are good to go
                        return
                    } else {
                        // A device is auto-provisioning. First check the request body team matches the token
                        // NOTE: If the token was not valid, the request would have been rejected by
                        // the verifySession decorator & request.session.provisioning would not be populated
                        const teamOK = request.body.team && request.body.team === request.session.provisioning.team
                        if (teamOK) {
                            const hasPermission = app.needsPermission('device:provision')
                            await hasPermission(request, reply) // hasPermission sends the error response if required which stops the request
                            return
                        }
                    }
                } else if (request.body?.team && request.session.User) {
                    // User action: check if the user is in the team and has the required role
                    request.teamMembership = await request.session.User.getTeamMembership(request.body.team)
                    const hasPermission = app.needsPermission('device:create')
                    await hasPermission(request, reply) // hasPermission sends the error response if required which stops the request
                    return
                }
                reply.code(401).send({ code: 'unauthorized', error: 'unauthorized' })
            }
        ],
        schema: {
            summary: 'Create or provision a device',
            tags: ['Devices'],
            body: {
                type: 'object',
                oneOf: [
                    {
                        allOf: [
                            { required: ['name'] },
                            { required: ['team'] },
                            { not: { required: ['setup'] } } // setup is not allowed when creating a device
                        ]
                    },
                    {
                        allOf: [
                            { required: ['setup'] }, // when provided, setup must be `true` (see enum below)
                            { not: { required: ['name'] } }, // neither of name or team are allowed when setting up a device
                            { not: { required: ['team'] } }
                        ]
                    }
                ],
                properties: {
                    name: { type: 'string' },
                    type: { type: 'string' },
                    team: { type: 'string' },
                    setup: { type: 'boolean', enum: [true] }, // enum only permits a value of true for setup
                    agentHost: { type: 'string' } // future, for audit log
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
        const otcSetupMode = request.body.setup === true && request.session.provisioning?.otcSetup === true
        let team, project
        // Additional checks. (initial membership/team/token checks done in preHandler and auth verifySession decorator)
        if (provisioningMode || otcSetupMode) {
            if (otcSetupMode) {
                const device = await app.db.models.Device.byId(request.session.provisioning.deviceId)
                if (device) {
                    const credentials = await device.refreshAuthTokens({ refreshOTC: false })
                    app.auditLog.Team.team.device.credentialsGenerated(0, null, device?.Team, device)
                    app.auditLog.Device.device.credentials.generated(0, null, device)
                    const response = app.db.views.Device.device(device)
                    response.credentials = credentials
                    return reply.send(response)
                } else {
                    return reply.code(404).send({ code: 'not_found', error: 'Not Found' })
                }
            } else {
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

        try {
            await team.checkDeviceCreateAllowed()
        } catch (err) {
            return reply
                .code(err.statusCode || 400)
                .send({
                    code: err.code || 'unexpected_error',
                    error: err.error || err.message
                })
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

                const credentials = await device.refreshAuthTokens({ refreshOTC: true })
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
                    await app.auditLog.Device.device.assigned(actionedBy, null, device.Project, device)
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
                    instance: { type: 'string', nullable: true },
                    application: { type: 'string', nullable: true }
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
        /** @type {import('../../auditLog/formatters').UpdatesCollection} */
        const updates = new app.auditLog.formatters.UpdatesCollection()
        let assignToProject = null
        let assignToApplication = null
        let postOpAuditLogAction = null
        if (request.body.instance !== undefined || request.body.application !== undefined) {
            // ### Add/Remove device to/from project ###

            const assignTo = request.body.instance ? 'instance' : (request.body.application ? 'application' : null)
            if (!assignTo) {
                // ### Remove device from application/project ###
                const unassignApplication = request.body.application === null
                const unassignInstance = request.body.instance === null

                const commonUpdates = async () => {
                    // Clear its target snapshot, so the next time it calls home
                    // it will stop the current snapshot
                    await device.setTargetSnapshot(null)
                    sendDeviceUpdate = true
                    // disable developer mode
                    device.mode = 'autonomous'
                    await device.save()
                }

                if (unassignApplication && device.Application) {
                    const oldApplication = device.Application
                    // unassign from application
                    await device.setApplication(null)
                    await commonUpdates()
                    await app.auditLog.Team.team.device.unassigned(request.session.User, null, device?.Team, oldApplication, device)
                    await app.auditLog.Application.application.device.unassigned(request.session.User, null, oldApplication, device)
                }

                if (unassignInstance && device.Project) {
                    const oldProject = device.Project
                    // unassign from project
                    await device.setProject(null)
                    await commonUpdates()

                    // disable developer mode
                    device.mode = 'autonomous'
                    await device.save()

                    await app.auditLog.Team.team.device.unassigned(request.session.User, null, device?.Team, oldProject, device)
                    await app.auditLog.Project.project.device.unassigned(request.session.User, null, oldProject, device)
                }
            } else if (assignTo === 'instance') {
                // ### Add device to instance ###

                // Update includes a instance id?
                if (device.Project?.id === request.body.instance) {
                    // Device is already assigned to this instance - nothing to do
                } else {
                    // Check if the specified project is in the same team
                    assignToProject = await app.db.models.Project.byId(request.body.instance)
                    if (!assignToProject) {
                        reply.code(400).send({ code: 'invalid_instance', error: 'invalid instance' })
                        return
                    }
                    if (assignToProject.Team.id !== device.Team.id) {
                        reply.code(400).send({ code: 'invalid_instance', error: 'invalid instance' })
                        return
                    }
                    // Project exists and is in the right team - assign it to the project
                    sendDeviceUpdate = await assignDeviceToProject(device, assignToProject)
                    postOpAuditLogAction = 'assigned-to-project'
                }
            } else if (assignTo === 'application') {
                // ### Add device to application ###

                // Update includes a application id?
                if (device.Application?.id === request.body.application) {
                    // Device is already assigned to this application - nothing to do
                } else {
                    // Check if the specified application is in the same team
                    assignToApplication = await app.db.models.Application.byId(request.body.application)
                    if (!assignToApplication) {
                        reply.code(400).send({ code: 'invalid_application', error: 'invalid application' })
                        return
                    }
                    if (assignToApplication.Team.id !== device.Team.id) {
                        reply.code(400).send({ code: 'invalid_application', error: 'invalid application' })
                        return
                    }

                    // Device exists and is in the right team - assign it to the application
                    sendDeviceUpdate = await assignDeviceToApplication(device, assignToApplication)
                    postOpAuditLogAction = 'assigned-to-application'
                }
            }
        } else {
            // ### Modify device properties ###
            if (request.body.targetSnapshot !== undefined && request.body.targetSnapshot !== device.targetSnapshotId) {
                // get snapshot from db
                const targetSnapshot = await app.db.models.ProjectSnapshot.byId(request.body.targetSnapshot, { includeFlows: false, includeSettings: false })
                if (!targetSnapshot) {
                    reply.code(400).send({ code: 'invalid_snapshot', error: 'invalid snapshot' })
                    return
                }
                // store original value for later audit log
                const originalSnapshotId = device.targetSnapshotId

                // Update the targetSnapshot of the device
                await app.db.models.Device.update({ targetSnapshotId: targetSnapshot.id }, {
                    where: {
                        id: device.id
                    }
                })
                await app.auditLog.Application.application.device.snapshot.deviceTargetSet(request.session.User, null, device.Application, device, targetSnapshot)
                updates.push('targetSnapshotId', originalSnapshotId, device.targetSnapshotId)
                sendDeviceUpdate = true
            }
            if (request.body.name !== undefined && request.body.name !== device.name) {
                updates.push('name', device.name, request.body.name)
                device.name = request.body.name
                sendDeviceUpdate = true
            }
            if (request.body.type !== undefined && request.body.type !== device.type) {
                updates.push('type', device.type, request.body.type)
                device.type = request.body.type
                sendDeviceUpdate = true
            }
        }

        // save and send update
        await device.save()
        const updatedDevice = await app.db.models.Device.byId(device.id)
        if (sendDeviceUpdate) {
            await app.db.controllers.Device.sendDeviceUpdateCommand(updatedDevice)
        }

        // check post op audit log action - create audit log entry if required
        switch (postOpAuditLogAction) {
        case 'assigned-to-project':
            await app.auditLog.Team.team.device.assigned(request.session.User, null, updatedDevice.Team, assignToProject, updatedDevice)
            await app.auditLog.Project.project.device.assigned(request.session.User, null, assignToProject, updatedDevice)
            await app.auditLog.Device.device.assigned(request.session.User, null, assignToProject, updatedDevice)
            break
        case 'assigned-to-application':
            await app.auditLog.Team.team.device.assigned(request.session.User, null, updatedDevice.Team, assignToApplication, updatedDevice)
            await app.auditLog.Application.application.device.assigned(request.session.User, null, assignToApplication, updatedDevice)
            await app.auditLog.Device.device.assigned(request.session.User, null, assignToApplication, updatedDevice)
            break
        }
        // fulfil team audit log updates
        if (updates.length > 0) {
            await app.auditLog.Team.team.device.updated(request.session.User, null, device.Team, device, updates)
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
        const credentials = await request.device.refreshAuthTokens({ refreshOTC: true }) // refreshOTC = true to generate a new OTC
        app.auditLog.Team.team.device.credentialsGenerated(request.session.User, null, request.device?.Team, request.device)
        app.auditLog.Device.device.credentials.generated(request.session.User, null, request.device)
        reply.send(credentials)
    })

    app.put('/:deviceId/settings', {
        preHandler: app.needsPermission('device:edit-env'), // members only
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
                    env: { type: 'array', items: { type: 'object', additionalProperties: true } },
                    autoSnapshot: { type: 'boolean' }
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
        const updates = new app.auditLog.formatters.UpdatesCollection()
        const currentSettings = await request.device.getAllSettings()
        // remove any extra properties from env to ensure they match the format of the body data
        // and prevent updates from being logged for unchanged values
        currentSettings.env = (currentSettings.env || []).map(e => ({ name: e.name, value: e.value }))
        const captureUpdates = (key) => {
            if (key === 'env') {
                // transform the env array to a map for better logging format
                const currentEnv = currentSettings.env.reduce((acc, e) => {
                    acc[e.name] = e.value
                    return acc
                }, {})
                const newEnv = request.body.env.reduce((acc, e) => {
                    acc[e.name] = e.value
                    return acc
                }, {})
                updates.pushDifferences({ env: currentEnv }, { env: newEnv })
            } else {
                updates.pushDifferences({ [key]: currentSettings[key] }, { [key]: request.body[key] })
            }
        }
        if (request.teamMembership?.role === Roles.Owner) {
            // owner is permitted to update all settings
            await request.device.updateSettings(request.body)
            const keys = Object.keys(request.body)
            // capture key/val updates sent in body
            keys.forEach(key => captureUpdates(key, currentSettings[key], request.body[key]))
        } else {
            // members are only permitted to update the env and autoSnapshot settings
            const settings = {}
            if (hasProperty(request.body, 'env')) {
                settings.env = request.body.env
                captureUpdates('env', currentSettings.env, request.body.env)
            }
            if (hasProperty(request.body, 'autoSnapshot')) {
                settings.autoSnapshot = request.body.autoSnapshot
                captureUpdates('autoSnapshot', currentSettings.autoSnapshot, request.body.autoSnapshot)
            }
            await request.device.updateSettings(settings)
        }
        await app.db.controllers.Device.sendDeviceUpdateCommand(request.device)
        // Log the updates
        if (updates.length > 0) {
            await app.auditLog.Device.device.settings.updated(request.session.User.id, null, request.device, updates)
        }
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
                        env: { type: 'array', items: { type: 'object', additionalProperties: true } },
                        autoSnapshot: { type: 'boolean' }
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
                env: settings?.env,
                autoSnapshot: settings?.autoSnapshot
            })
        }
    })

    app.post('/:deviceId/logs', {
        preHandler: app.needsPermission('device:read'),
        schema: {
            summary: 'Start device logging',
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
                        url: { type: 'string' },
                        username: { type: 'string' },
                        password: { type: 'string' }
                    }
                },
                '4xx': {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        const team = await app.db.models.Team.byId(request.device.TeamId)
        setTimeout(() => {
            app.comms.devices.sendCommand(team.hashid, request.device.hashid, 'startLog', '')
            app.log.info(`Enable device logging ${request.device.hashid} in team ${team.hashid}`)
        }, 1000)
        reply.send(await app.db.controllers.BrokerClient.createClientForFrontend(request.device))
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
        await app.db.controllers.Device.sendDeviceUpdateCommand(request.device)
        // Audit log the change
        if (request.device.mode === 'developer') {
            await app.auditLog.Team.team.device.developerMode.enabled(request.session.User, null, request.device.Team, request.device)
            await app.auditLog.Device.device.developerMode.enabled(request.session.User, null, request.device)
        } else {
            await app.auditLog.Team.team.device.developerMode.disabled(request.session.User, null, request.device.Team, request.device)
            await app.auditLog.Device.device.developerMode.disabled(request.session.User, null, request.device)
        }
        reply.send({ mode: request.body.mode })
    })

    /**
     * Create a snapshot from a device owned by an instance
     * @name /api/v1/devices/:deviceId/snapshot
     * @memberof module:forge/routes/api/device
     */
    app.post('/:deviceId/snapshot', {
        preHandler: app.needsPermission('project:snapshot:create'),
        schema: {
            summary: 'Create a snapshot from a device owned by an instance',
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
        if (request.device.isApplicationOwned) {
            reply.code(400).send({ code: 'invalid_device', error: 'Device is not associated with a instance, application owned devices must use the application device snapshot endpoint' })
            return
        }
        if (!request.device.Project) {
            reply.code(400).send({ code: 'invalid_device', error: 'Device must be associated with a instance to create a snapshot' })
            return
        }

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

    /**
     * @name /api/v1/devices/:id/audit-log
     * @memberof forge.routes.api.devices
     */
    app.get('/:deviceId/audit-log', {
        preHandler: app.needsPermission('device:audit-log'),
        schema: {
            summary: '',
            tags: ['Devices'],
            params: {
                type: 'object',
                properties: {
                    deviceId: { type: 'string' }
                }
            },
            query: {
                allOf: [
                    { $ref: 'PaginationParams' },
                    { $ref: 'AuditLogQueryParams' }
                ]
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        meta: { $ref: 'PaginationMeta' },
                        count: { type: 'number' },
                        log: { $ref: 'AuditLogEntryList' }
                    }
                },
                '4xx': {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        const paginationOptions = app.getPaginationOptions(request)
        const logEntries = await app.db.models.AuditLog.forDevice(request.device.id, paginationOptions)
        const result = app.db.views.AuditLog.auditLog(logEntries)
        reply.send(result)
    })

    async function assignDeviceToProject (device, project) {
        await device.setProject(project)
        // Set the target snapshot to match the project's one
        const deviceSettings = await project.getSetting('deviceSettings')
        device.targetSnapshotId = deviceSettings?.targetSnapshot
        return true
    }
    async function assignDeviceToApplication (device, application) {
        await device.setApplication(application)
        // Set the target snapshot to match the project's one
        // TODO
        // const deviceSettings = await application.getSetting('deviceSettings')
        // device.targetSnapshotId = deviceSettings?.targetSnapshot
        return true
    }
    // #endregion
}
