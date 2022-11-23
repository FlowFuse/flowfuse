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
                        reply.code(404).send({ code: 'not_found', error: 'Not Found' })
                        return
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
        preHandler: app.needsPermission('project:snapshot:list')
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
        preHandler: app.needsPermission('project:snapshot:read')
    }, async (request, reply) => {
        reply.send(app.db.views.ProjectSnapshot.snapshot(request.snapshot))
    })

    /**
     * Delete a snapshot
     */
    app.delete('/:snapshotId', {
        preHandler: app.needsPermission('project:snapshot:delete')
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
     */
    app.post('/', {
        preHandler: app.needsPermission('project:snapshot:create')
    }, async (request, reply) => {
        const snapShot = await app.db.controllers.ProjectSnapshot.createSnapshot(
            request.project,
            request.session.User,
            request.body
        )
        snapShot.User = request.session.User
        await app.auditLog.Project.project.snapshot.created(request.session.User, null, request.project, snapShot)
        reply.send(app.db.views.ProjectSnapshot.snapshot(snapShot))
    })
}
