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
            if (request.params.id) {
                // non upload route
                request.snapshot = await app.db.models.ProjectSnapshot.byId(request.params.id)
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
            } else if (request.body.ownerId && request.body.ownerType && request.body.snapshot) {
                // upload route
                if (request.body.ownerType === 'device') {
                    request.owner = await app.db.models.Device.byId(request.body.ownerId)
                    request.ownerType = 'device'
                } else if (request.body.ownerType === 'instance') {
                    request.owner = await app.db.models.Project.byId(request.body.ownerId)
                    request.ownerType = 'instance'
                } else {
                    return reply.code(400).send({ code: 'bad_request', error: 'Invalid ownerType' })
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
    app.get('/:id', {
        preHandler: app.needsPermission('snapshot:meta'),
        schema: {
            summary: 'Get summary of a snapshot',
            tags: ['Snapshots'],
            params: {
                type: 'object',
                properties: {
                    id: { type: 'string' }
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
        // reload the snapshot to get the full details, including the User & Device/Project
        // these are needed for viewer permissions on download "package.json" action since it
        // needs the owner project/device & modules in the snapshot settings to generate it.
        // Flows/settings/env are NOT included in the metadata response thanks to to the schema/view
        await request.snapshot.reload({ include: ['User', 'Device', 'Project'] })
        reply.send(projectSnapshotView.snapshot(request.snapshot))
    })

    /**
     * Get details of a snapshot - full details
     */
    app.get('/:id/full', {
        preHandler: app.needsPermission('snapshot:full'),
        schema: {
            summary: 'Get details of a snapshot',
            tags: ['Snapshots'],
            params: {
                type: 'object',
                properties: {
                    id: { type: 'string' }
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
    app.delete('/:id', {
        preHandler: app.needsPermission('snapshot:delete'),
        schema: {
            summary: 'Delete a snapshot',
            tags: ['Snapshots'],
            params: {
                type: 'object',
                properties: {
                    id: { type: 'string' }
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
     * Update a snapshot
     */
    app.put('/:id', {
        preHandler: app.needsPermission('snapshot:edit'),
        schema: {
            summary: 'Update a snapshot',
            tags: ['Snapshots'],
            params: {
                type: 'object',
                properties: {
                    id: { type: 'string' }
                }
            },
            body: {
                type: 'object',
                properties: {
                    name: { type: 'string' },
                    description: { type: 'string' }
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
        const snapshot = await snapshotController.updateSnapshot(request.snapshot, request.body)
        // TODO: audit log
        // if (request.ownerType === 'device') {
        //     const application = await request.owner.getApplication()
        //     await applicationLogger.application.device.snapshot.updated(request.session.User, null, application, request.owner, request.snapshot, snapshot)
        // } else if (request.ownerType === 'instance') {
        //     await projectLogger.project.snapshot.updated(request.session.User, null, request.owner, request.snapshot, snapshot)
        // }
        reply.send(projectSnapshotView.snapshot(snapshot))
    })

    /**
     * Export a snapshot for later import in another project or platform
     */
    app.post('/:id/export', {
        preHandler: app.needsPermission('snapshot:export'),
        schema: {
            summary: 'Export a snapshot',
            tags: ['Snapshots'],
            params: {
                type: 'object',
                properties: {
                    id: { type: 'string' }
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

    /**
     * Import a snapshot
     */
    app.post('/import', {
        preHandler: app.needsPermission('snapshot:import'),
        schema: {
            summary: 'Upload a snapshot',
            tags: ['Snapshots'],
            body: {
                type: 'object',
                properties: {
                    ownerId: { type: 'string' },
                    ownerType: { type: 'string' },
                    snapshot: {
                        type: 'object',
                        properties: {
                            name: { type: 'string' },
                            description: { type: 'string' },
                            flows: {
                                type: 'object',
                                properties: {
                                    flows: { type: 'array', items: {}, minItems: 0 },
                                    credentials: { type: 'object' }
                                },
                                required: ['flows']
                            },
                            settings: {
                                type: 'object',
                                properties: {
                                    settings: { type: 'object' },
                                    env: { type: 'object' },
                                    modules: { type: 'object' }
                                },
                                required: []
                            }
                        },
                        required: ['name', 'flows', 'settings']
                    },
                    credentialSecret: { type: 'string' }
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
        const owner = request.owner
        const snapshot = request.body.snapshot
        if (!owner || !snapshot) {
            reply.code(400).send({ code: 'bad_request', error: 'owner and snapshot are mandatory in the body' })
            return
        }
        if (snapshot.flows.credentials?.$ && !request.body.credentialSecret) {
            reply.code(400).send({ code: 'bad_request', error: 'Credential secret is required when importing a snapshot with credentials' })
            return
        }
        try {
            const newSnapshot = await snapshotController.uploadSnapshot(owner, snapshot, request.body.credentialSecret, request.session.User)
            if (!newSnapshot) {
                throw new Error('Failed to upload snapshot')
            }
            // reload the snapshot to get the full details, including the User & Device/Project
            await newSnapshot.reload({ include: ['User', 'Device', 'Project'] })
            if (request.ownerType === 'device') {
                const application = await owner.getApplication()
                await applicationLogger.application.device.snapshot.imported(request.session.User, null, application, owner, null, null, newSnapshot)
            } else if (request.ownerType === 'instance') {
                await projectLogger.project.snapshot.imported(request.session.User, null, owner, null, null, newSnapshot)
            }
            reply.send(projectSnapshotView.snapshot(newSnapshot))
        } catch (err) {
            // if err message is a JSON.parse failure in decryptCreds, it's a bad secret
            if (/JSON\.parse.*decryptCreds/si.test(err.stack)) {
                return reply.code(400).send({ code: 'bad_request', error: 'Invalid credential secret' })
            }
            throw err // handled by global error handler
        }
    })
}
