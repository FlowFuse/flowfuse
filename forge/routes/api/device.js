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
                // Attach the team membership to the request so needsPermission can
                // verify the user has the required role
                if (request.body && request.body.team) {
                    request.teamMembership = await request.session.User.getTeamMembership(request.body.team)
                }
            },
            app.needsPermission('device:create')
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
        const teamMembership = await request.session.User.getTeamMembership(request.body.team, true)
        // Assume membership is enough to allow project creation.
        // If we have roles that limit creation, that will need to be checked here.

        if (!teamMembership) {
            reply.code(401).send({ code: 'unauthorized', error: 'Current user not in team ' + request.body.team })
            return
        }

        const team = teamMembership.get('Team')
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
            const device = await app.db.models.Device.create({
                name: request.body.name,
                type: request.body.type,
                credentialSecret: ''
            })

            await team.addDevice(device)

            await device.reload({
                include: [
                    { model: app.db.models.Team }
                ]
            })

            const credentials = await device.refreshAuthTokens()
            await app.auditLog.Team.team.device.created(request.session.User, null, team, device)

            const response = app.db.views.Device.device(device)
            response.credentials = credentials

            if (app.license.active() && app.billing) {
                await app.billing.updateTeamDeviceCount(team)
            }
            reply.send(response)
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
        if (request.body.project !== undefined) {
            if (request.body.project === null) {
                // Remove device from project if it is currently assigned
                if (request.device.Project !== null) {
                    const oldProject = request.device.Project
                    // unassign from project
                    await request.device.setProject(null)
                    // Clear its target snapshot, so the next time it calls home
                    // it will stop the current snapshot
                    await request.device.setTargetSnapshot(null)
                    sendDeviceUpdate = true

                    await app.auditLog.Team.team.device.unassigned(request.session.User, null, request.device?.Team, oldProject, request.device)
                    await app.auditLog.Project.project.device.unassigned(request.session.User, null, oldProject, request.device)
                } else {
                    // project is already unassigned - nothing to do
                }
            } else {
                // Update includes a project id
                if (request.device.Project?.id === request.body.project) {
                    // Project is already assigned to this project - nothing to do
                } else {
                    // Check if the specified project is in the same team
                    const project = await app.db.models.Project.byId(request.body.project)
                    if (!project) {
                        reply.code(400).send({ code: 'invalid_project', error: 'invalid project' })
                        return
                    }
                    if (project.Team.id !== request.device.Team.id) {
                        reply.code(400).send({ code: 'invalid_project', error: 'invalid project' })
                        return
                    }
                    // Project exists and is in the right team
                    await request.device.setProject(project)
                    // Set the target snapshot to match the project's one
                    const deviceSettings = await project.getSetting('deviceSettings')
                    request.device.targetSnapshotId = deviceSettings?.targetSnapshot

                    sendDeviceUpdate = true
                    await app.auditLog.Team.team.device.assigned(request.session.User, null, request.device.Team, project, request.device)
                    await app.auditLog.Project.project.device.assigned(request.session.User, null, project, request.device)
                }
            }
            // await TestObjects.deviceOne.setProject(TestObjects.deviceProject)
        } else {
            let changed = false
            const updates = new app.auditLog.formatters.UpdatesCollection()
            if (request.body.name !== undefined && request.body.name !== request.device.name) {
                updates.push('name', request.device.name, request.body.name)
                request.device.name = request.body.name
                sendDeviceUpdate = true
                changed = true
            }
            if (request.body.type !== undefined && request.body.type !== request.device.type) {
                updates.push('type', request.device.type, request.body.type)
                request.device.type = request.body.type
                sendDeviceUpdate = true
                changed = true
            }
            if (changed) {
                await app.auditLog.Team.team.device.updated(request.session.User, null, request.device.Team, request.device, updates)
            }
        }
        await request.device.save()

        const updatedDevice = await app.db.models.Device.byId(request.device.id)
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
}
