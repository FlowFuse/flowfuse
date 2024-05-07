/**
 * Snapshot api routes
 *
 * - /api/v1/snapshots/
 *
 * @namespace project
 * @memberof forge.routes.api
 */

module.exports = async function (app) {
    /** @type {typeof import('../../db/controllers/Snapshot.js')} */
    const snapshotController = app.db.controllers.Snapshot
    /** @type {typeof import('../../db/views/ProjectSnapshot.js')} */
    const projectSnapshotView = app.db.views.ProjectSnapshot
    const applicationLogger = require('../../../forge/auditLog/application').getLoggers(app)
    const projectLogger = require('../../../forge/auditLog/project').getLoggers(app)

    app.addHook('preHandler', async (request, reply) => {
        try {
            request.ownerType = null
            request.owner = null
            if (request.params.snapshotId) {
                request.snapshot = await app.db.models.ProjectSnapshot.byId(request.params.snapshotId)
                if (!request.snapshot) {
                    return reply.code(404).send({ code: 'not_found', error: 'Not Found' })
                }
                request.ownerType = request.snapshot.ownerType
                if (request.ownerType === 'instance') {
                    request.owner = await request.snapshot.getProject()
                    if (!request.owner) {
                        return reply.code(404).send({ code: 'not_found', error: 'Not Found' })
                    }
                } else if (request.ownerType === 'device') {
                    request.owner = await request.snapshot.getDevice()
                    if (!request.owner) {
                        return reply.code(404).send({ code: 'not_found', error: 'Not Found' })
                    }
                } else {
                    return reply.code(404).send({ code: 'not_found', error: 'Not Found' })
                }
            }
            if (request.session.User) {
                request.teamMembership = await request.session.User.getTeamMembership(request.owner.TeamId)
                if (!request.teamMembership && !request.session.User.admin) {
                    return reply.code(404).send({ code: 'not_found', error: 'Not Found' })
                }
            } else {
                return reply.code(401).send({ code: 'unauthorized', error: 'Unauthorized' })
            }
        } catch (err) {
            reply.code(404).send({ code: 'not_found', error: 'Not Found' })
        }
    })

    /**
     * Get a snapshot - metadata only
     */
    app.get('/:snapshotId', {
        preHandler: app.needsPermission('snapshot:meta'),
        schema: {
            summary: 'Get summary of a snapshot',
            tags: ['Snapshots'],
            params: {
                type: 'object',
                properties: {
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
        reply.send(projectSnapshotView.snapshotSummary(request.snapshot))
    })

    /**
     * Get details of a snapshot - full details
     */
    app.get('/:snapshotId/full', {
        preHandler: app.needsPermission('snapshot:full'),
        schema: {
            summary: 'Get details of a snapshot',
            tags: ['Snapshots'],
            params: {
                type: 'object',
                properties: {
                    snapshotId: { type: 'string' }
                }
            },
            response: {
                200: {
                    $ref: 'FullSnapshot' // identical to ExportedSnapshot but excludes credentials
                },
                '4xx': {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        const snapshot = {
            ...(request.snapshot.toJSON ? request.snapshot.toJSON() : request.snapshot)
        }
        reply.send(projectSnapshotView.snapshotExport(snapshot))
    })

    /**
     * Delete a snapshot
     */
    app.delete('/:snapshotId', {
        preHandler: app.needsPermission('snapshot:delete'),
        schema: {
            summary: 'Delete a snapshot',
            tags: ['Snapshots'],
            params: {
                type: 'object',
                properties: {
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
        await snapshotController.deleteSnapshot(request.snapshot)
        if (request.ownerType === 'device') {
            const application = await request.owner.getApplication()
            await applicationLogger.application.device.snapshot.deleted(request.session.User, null, application, request.owner, request.snapshot)
        } else if (request.ownerType === 'instance') {
            await projectLogger.project.snapshot.deleted(request.session.User, null, request.owner, request.snapshot)
        }
        reply.send({ status: 'okay' })
    })

    /**
     * Export a snapshot for later import in another project or platform
     */
    app.post('/:snapshotId/export', {
        preHandler: app.needsPermission('snapshot:export'),
        schema: {
            summary: 'Export a snapshot',
            tags: ['Snapshots'],
            params: {
                type: 'object',
                properties: {
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
                    $ref: 'ExportedSnapshot' // // identical to FullSnapshot but includes credentials
                },
                '4xx': {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        const options = {
            credentialSecret: request.body.credentialSecret,
            credentials: request.body.credentials,
            owner: request.owner // the instance or device that owns the snapshot
        }

        if (!options.credentialSecret) {
            reply.code(400).send({ code: 'bad_request', error: 'credentialSecret is mandatory in the body' })
            return
        }

        const snapshot = await snapshotController.exportSnapshot(request.snapshot, options)
        if (snapshot) {
            const snapshotExport = projectSnapshotView.snapshotExport(snapshot, request.session.User)
            if (request.ownerType === 'device') {
                const application = await request.owner.getApplication()
                await applicationLogger.application.device.snapshot.exported(request.session.User, null, application, request.owner, request.snapshot)
            } else if (request.ownerType === 'instance') {
                await projectLogger.project.snapshot.exported(request.session.User, null, request.owner, request.snapshot)
            }
            reply.send(snapshotExport)
        } else {
            reply.send({})
        }
    })
}
