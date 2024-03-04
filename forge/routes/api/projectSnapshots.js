/**
 * Project Snapshot api routes
 *
 * request.project will be defined for any route defined in here
 *
 * - /api/v1/projects/:instanceId/snapshots/
 *
 * @namespace project
 * @memberof forge.routes.api
 */

const { createSnapshot } = require('../../services/snapshots')

module.exports = async function (app) {
    app.addHook('preHandler', async (request, reply) => {
        if (request.params.snapshotId !== undefined) {
            if (request.params.snapshotId) {
                try {
                    // TODO: Only the export snapshot route requires the snapshot to have flows attached.
                    // We could single that out (as an uncommon path) and otherwise add { includeFlows: false }
                    // here to avoid loading the full flow object.
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
    })
    // app.addHook('preHandler', app.needsPermission('project:change-status'))

    /**
     * Get list of all project snapshots
     */
    app.get('/', {
        preHandler: app.needsPermission('project:snapshot:list'),
        schema: {
            summary: 'Get a list of instance snapshots',
            tags: ['Snapshots'],
            params: {
                type: 'object',
                properties: {
                    instanceId: { type: 'string' }
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
        const snapshots = await app.db.models.ProjectSnapshot.forProject(request.project.id, paginationOptions)
        snapshots.snapshots = snapshots.snapshots.map(s => app.db.views.ProjectSnapshot.snapshot(s))
        reply.send(snapshots)
    })

    /**
     * Get details of a snapshot - metadata only
     */
    app.get('/:snapshotId', {
        preHandler: app.needsPermission('project:snapshot:read'),
        schema: {
            summary: 'Get details of a snapshot',
            tags: ['Snapshots'],
            params: {
                type: 'object',
                properties: {
                    instanceId: { type: 'string' },
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
        preHandler: app.needsPermission('project:snapshot:delete'),
        schema: {
            summary: 'Delete a snapshot',
            tags: ['Snapshots'],
            params: {
                type: 'object',
                properties: {
                    instanceId: { type: 'string' },
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
        const project = await request.snapshot.getProject()
        const deviceSettings = await project.getSetting('deviceSettings') || {
            targetSnapshot: null
        }
        if (deviceSettings.targetSnapshot === request.snapshot.id) {
            // We're about to delete the active snapshot for this project
            await project.updateSetting('deviceSettings', {
                targetSnapshot: null
            })
            // The cascade relationship will ensure Device.targetSnapshotId is cleared
            if (app.comms) {
                const team = await project.getTeam()
                app.comms.devices.sendCommandToProjectDevices(team.hashid, project.id, 'update', {
                    snapshot: null
                })
            }
        }
        await request.snapshot.destroy()
        await app.auditLog.Project.project.snapshot.deleted(request.session.User, null, request.project, request.snapshot)
        reply.send({ status: 'okay' })
    })

    /**
     * Create a snapshot
     * @name /api/v1/projects/:instanceId/snapshots
     */
    app.post('/', {
        preHandler: app.needsPermission('project:snapshot:create'),
        schema: {
            summary: 'Create a snapshot from an instance',
            tags: ['Snapshots'],
            params: {
                type: 'object',
                properties: {
                    instanceId: { type: 'string' }
                }
            },
            body: {
                type: 'object',
                properties: {
                    name: { type: 'string' },
                    description: { type: 'string' },
                    flows: {
                        oneOf: [
                            {
                                // This format matches the snapshot object in the database, the schema `ExportedSnapshot` and the
                                // original snapshot object format returned by `createSnapshot` function in `controllers/ProjectSnapshot.js`
                                type: 'object',
                                properties: {
                                    flows: { type: 'array', items: { type: 'object' } },
                                    credentials: { type: 'object' }
                                }
                            },
                            {
                                // Alt API format
                                // This format matches the format of the exported project object created by `exportProject` function in `controllers/Project.js`
                                // and supports the format expected by `createSnapshot` function in `services/snapshots.js`
                                type: 'array', items: { type: 'object' }
                            }
                        ]
                    },
                    credentials: { type: 'object' },
                    credentialSecret: { type: 'string' },
                    settings: {
                        type: 'object',
                        properties: {
                            modules: { type: 'object', additionalProperties: true }
                        }
                    },
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
        const project = request.project
        const user = request.session.User
        const snapshotProperties = request.body

        const snapShot = await createSnapshot(app, project, user, snapshotProperties)
        reply.send(app.db.views.ProjectSnapshot.snapshot(snapShot))
    })

    /**
     * Export snapshot: return the full snapshot, including settings, envars, flows and re-encrypted credentials.
     * /api/v1/projects/:instanceId/snapshots/:snapshotId/export
     */
    app.post('/:snapshotId/export', {
        preHandler: app.needsPermission('project:snapshot:export'),
        schema: {
            summary: 'Export an instance snapshot using the provided credentialSecret',
            tags: ['Snapshots'],
            params: {
                type: 'object',
                properties: {
                    instanceId: { type: 'string' },
                    snapshotId: { type: 'string' }
                }
            },
            body: {
                type: 'object',
                properties: {
                    credentialSecret: { type: 'string' }
                }
            },
            response: {
                200: {
                    $ref: 'ExportedSnapshot'
                },
                '4xx': {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        if (!request.body.credentialSecret) {
            reply.code(400).send({ code: 'bad_request', error: 'credentialSecret is mandatory in the body' })
        }

        const snapShot = await app.db.controllers.ProjectSnapshot.exportSnapshot(
            request.project,
            request.snapshot,
            request.body
        )
        if (snapShot) {
            await app.auditLog.Project.project.snapshot.exported(request.session.User, null, request.project, snapShot)
            snapShot.exportedBy = request.session.User
            reply.send(snapShot)
        } else {
            reply.send({})
        }
    })
}
