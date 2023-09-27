/**
 * device Snapshot api routes
 *
 * request.device will be defined for any route defined in here
 *
 * NOTE: A device snapshot in this context refers to a device owned by an application
 *
 * - /api/v1/devices/:deviceId/snapshots/
 *
 * @namespace project
 * @memberof forge.routes.api
 */

module.exports = async function (app) {
    app.addHook('preHandler', async (request, reply) => {
        if (request.params.snapshotId !== undefined) {
            if (request.params.snapshotId) {
                try {
                    request.snapshot = await app.db.models.ProjectSnapshot.byId(request.params.snapshotId)
                    if (!request.snapshot) {
                        reply.code(404).send({ code: 'not_found', error: 'Not Found' })
                        return // eslint-disable-line no-useless-return
                    }
                } catch (err) {
                    reply.code(404).send({ code: 'not_found', error: 'Not Found' })
                }
            } else {
                reply.code(404).send({ code: 'not_found', error: 'Not Found' })
            }
        }
        // teamMembership is required for needsPermission
        // teamMembership is added to request in ./devices.js preHandler
        if (!request.teamMembership && !request.session.User.admin) {
            return reply.code(404).send({ code: 'not_found', error: 'Not Found' })
        }
    })

    /**
     * Get list of all snapshots for a device
     */
    app.get('/', {
        preHandler: app.needsPermission('device:snapshot:list'),
        schema: {
            summary: 'Get a list of snapshots for a device',
            tags: ['DeviceSnapshots'],
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
                        meta: { $ref: 'PaginationMeta' },
                        count: { type: 'number' },
                        snapshots: { type: 'array', items: { $ref: 'Snapshot' } }
                    }
                },
                '4xx': {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        const paginationOptions = app.getPaginationOptions(request)
        const snapshots = await app.db.models.ProjectSnapshot.forDevice(request.device.id, paginationOptions)
        snapshots.snapshots = snapshots.snapshots.map(s => app.db.views.ProjectSnapshot.snapshot(s))
        reply.send(snapshots)
    })

    /**
     * Get details of a snapshot - metadata only
     */
    app.get('/:snapshotId', {
        preHandler: app.needsPermission('device:snapshot:read'),
        schema: {
            summary: 'Get details of a device snapshot',
            tags: ['DeviceSnapshots'],
            params: {
                type: 'object',
                properties: {
                    deviceId: { type: 'string' },
                    snapshotId: { type: 'string' }
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
        reply.send(app.db.views.ProjectSnapshot.snapshot(request.snapshot))
    })

    /**
     * Delete a snapshot
     */
    app.delete('/:snapshotId', {
        preHandler: app.needsPermission('device:snapshot:delete'),
        schema: {
            summary: 'Delete a devices snapshot',
            tags: ['DeviceSnapshots'],
            params: {
                type: 'object',
                properties: {
                    deviceId: { type: 'string' },
                    snapshotId: { type: 'string' }
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
        const device = await request.snapshot.getDevice()
        const deviceSettings = await device.getSetting('deviceSettings') || {
            targetSnapshot: null
        }
        if (deviceSettings.targetSnapshot === request.snapshot.id) {
            // We're about to delete the active snapshot for this device
            await device.updateSetting('deviceSettings', {
                targetSnapshot: null
            })
            // The cascade relationship will ensure Device.targetSnapshotId is cleared
            if (app.comms) {
                const team = await device.getTeam()
                app.comms.devices.sendCommandToProjectDevices(team.hashid, device.id, 'update', {
                    snapshot: null
                })
            }
        }
        await request.snapshot.destroy()
        // TODO: device snapshot: Application level Audit log
        // await app.auditLog.Project.project.snapshot.deleted(request.session.User, null, request.device, request.snapshot)
        reply.send({ status: 'okay' })
    })

    /**
     * Create a snapshot from a device.
     * @name /api/v1/devices/:deviceId/
     * @memberof module:forge/routes/api/device
     */
    app.post('/', {
        preHandler: app.needsPermission('device:snapshot:create'),
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
        if (request.device.ownerType !== 'application') {
            reply.code(400).send({ code: 'invalid_device', error: 'Device is not associated with an application' })
            return
        }

        const snapshotOptions = {
            name: request.body.name,
            description: request.body.description,
            setAsTarget: undefined // TODO: device snapshot: what to do with `setAsTarget`?
        }
        const snapShot = await app.db.controllers.ProjectSnapshot.createDeviceSnapshot(
            request.device.Application,
            request.device,
            request.session.User,
            snapshotOptions
        )
        snapShot.User = request.session.User
        // TODO: device snapshot: Needs application level audit log
        // TODO: device snapshot: what to do with `setAsTarget`?
        reply.send(app.db.views.ProjectSnapshot.snapshot(snapShot))
    })
}
