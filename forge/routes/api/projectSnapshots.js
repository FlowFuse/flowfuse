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
            tags: ['Teams'],
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
                    flows: { type: 'array', items: { type: 'object' } },
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
}
