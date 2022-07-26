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
                        reply.code(404).type('text/html').send('Not Found')
                        return
                    }
                    if (request.session.User) {
                        request.teamMembership = await request.session.User.getTeamMembership(request.device.Team.id)
                    }
                } catch (err) {
                    reply.code(404).type('text/html').send('Not Found')
                }
            } else {
                reply.code(404).type('text/html').send('Not Found')
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
    app.get('/:deviceId', async (request, reply) => {
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
            reply.code(401).send({ error: 'Current user not in team ' + request.body.team })
            return
        }

        const team = teamMembership.get('Team')

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

        await app.db.controllers.AuditLog.teamLog(
            team.id,
            request.session.User.id,
            'team.device.created',
            { id: device.hashid }
        )

        const response = app.db.views.Device.device(device)
        response.credentials = credentials
        reply.send(response)
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
        await request.device.destroy()
        await app.db.controllers.AuditLog.teamLog(
            request.device.Team.id,
            request.session.User.id,
            'team.device.deleted',
            { id: request.device.hashid }
        )
        reply.send({ status: 'okay' })
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

                    await app.db.controllers.AuditLog.teamLog(
                        request.device.Team.id,
                        request.session.User.id,
                        'team.device.unassigned',
                        { id: request.device.hashid, project: oldProject.id }
                    )
                    await app.db.controllers.AuditLog.projectLog(
                        oldProject.id,
                        request.session.User.id,
                        'project.device.unassigned',
                        { id: request.device.hashid }
                    )
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
                        reply.code(400).send({ error: 'invalid project' })
                        return
                    }
                    if (project.Team.id !== request.device.Team.id) {
                        reply.code(400).send({ error: 'invalid project' })
                        return
                    }
                    // Project exists and is in the right team
                    await request.device.setProject(project)
                    // Set the target snapshot to match the project's one
                    const deviceSettings = await project.getSetting('deviceSettings')
                    request.device.targetSnapshotId = deviceSettings?.targetSnapshot

                    sendDeviceUpdate = true

                    await app.db.controllers.AuditLog.teamLog(
                        request.device.Team.id,
                        request.session.User.id,
                        'team.device.assigned',
                        { id: request.device.hashid, project: project.id }
                    )
                    await app.db.controllers.AuditLog.projectLog(
                        project.id,
                        request.session.User.id,
                        'project.device.assigned',
                        { id: request.device.hashid }
                    )
                }
            }
            // await TestObjects.deviceOne.setProject(TestObjects.deviceProject)
        } else {
            let changed = false
            if (request.body.name !== undefined && request.body.name !== request.device.name) {
                request.device.name = request.body.name
                changed = true
            }
            if (request.body.type !== undefined && request.body.type !== request.device.type) {
                request.device.type = request.body.type
                changed = true
            }
            if (changed) {
                await app.db.controllers.AuditLog.teamLog(
                    request.device.Team.id,
                    request.session.User.id,
                    'team.device.updated',
                    { id: request.body.deviceId }
                )
            }
        }
        await request.device.save()

        const updatedDevice = await app.db.models.Device.byId(request.device.id)
        if (app.comms && sendDeviceUpdate) {
            app.comms.devices.sendCommand(updatedDevice.Team.hashid, updatedDevice.hashid, 'update', {
                project: updatedDevice.Project?.id || null,
                snapshot: updatedDevice.targetSnapshot?.hashid || null,
                settings: updatedDevice.settingsHash || null
            })
        }
        reply.send(app.db.views.Device.device(updatedDevice))
    })

    app.post('/:deviceId/generate_credentials', {
        preHandler: app.needsPermission('device:edit')
    }, async (request, reply) => {
        const credentials = await request.device.refreshAuthTokens()
        await app.db.controllers.AuditLog.teamLog(
            request.device.Team.id,
            request.session.User.id,
            'team.device.credentialsGenerated',
            { id: request.device.hashid }
        )
        reply.send(credentials)
    })

    app.put('/:deviceId/settings', {
        preHandler: app.needsPermission('device:edit')
    }, async (request, reply) => {
        await request.device.updateSettings(request.body)
        if (app.comms) {
            app.comms.devices.sendCommand(request.device.Team.hashid, request.device.hashid, 'update', {
                project: request.device.Project?.id || null,
                snapshot: request.device.targetSnapshot?.hashid || null,
                settings: request.device.settingsHash || null
            })
        }
        reply.send({ status: 'okay' })
    })

    app.get('/:deviceId/settings', {
        preHandler: app.needsPermission('device:edit')
    }, async (request, reply) => {
        const settings = await request.device.getAllSettings()
        reply.send(settings)
    })
}
