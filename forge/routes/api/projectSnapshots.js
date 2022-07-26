/**
 * Project Snapshot api routes
 *
 * request.project will be defined for any route defined in here
 *
 * - /api/v1/project/:projectId/snapshots/
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
                        reply.code(404).type('text/html').send('Not Found')
                        return
                    }
                } catch (err) {
                    reply.code(404).type('text/html').send('Not Found')
                }
            } else {
                reply.code(404).type('text/html').send('Not Found')
            }
        }
    })
    // app.addHook('preHandler', app.needsPermission('project:change-status'))

    /**
     * Get list of all project snapshots
     */
    app.get('/', async (request, reply) => {
        const paginationOptions = app.getPaginationOptions(request)
        const snapshots = await app.db.models.ProjectSnapshot.forProject(request.project.id, paginationOptions)
        snapshots.snapshots = snapshots.snapshots.map(s => app.db.views.ProjectSnapshot.snapshot(s))
        reply.send(snapshots)
    })

    /**
     * Get details of a snapshot - metadata only
     */
    app.get('/:snapshotId', async (request, reply) => {
        reply.send(app.db.views.ProjectSnapshot.snapshot(request.snapshot))
    })

    /**
     * Delete a snapshot
     */
    app.delete('/:snapshotId', {
        preHandler: app.needsPermission('project:snapshot:delete')
    }, async (request, reply) => {
        const id = request.snapshot.hashid
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
        await app.db.controllers.AuditLog.projectLog(
            request.project.id,
            request.session.User.id,
            'project.snapshot.deleted',
            { id }
        )
        reply.send({ status: 'okay' })
    })

    /**
     * Create a snapshot
     */
    app.post('/', {
        preHandler: app.needsPermission('project:snapshot:create')
    }, async (request, reply) => {
        // TODO: permission check
        const snapShot = await app.db.controllers.ProjectSnapshot.createSnapshot(
            request.project,
            request.session.User,
            {
                name: request.body.name || '',
                description: request.body.description || ''
            }
        )
        snapShot.User = request.session.User
        await app.db.controllers.AuditLog.projectLog(
            request.project.id,
            request.session.User.id,
            'project.snapshot.created',
            { id: snapShot.hashid }
        )
        reply.send(app.db.views.ProjectSnapshot.snapshot(snapShot))
    })
}
