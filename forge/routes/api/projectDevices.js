/**
 * Project Devices api routes
 *
 * - /api/v1/projects/:projectId/devices
 *
 * By the time these handlers are invoked, :projectId will have been validated
 * and 404'd if it doesn't exist. `request.project` will contain the project object
 *
 * @namespace projectDevices
 * @memberof forge.routes.api
 */
module.exports = async function (app) {
    /**
     * Get a list of projects assigned to this team
     * @name /api/v1/project/:projectId/devices
     * @static
     * @memberof forge.routes.api.project
     */
    app.get('/', async (request, reply) => {
        const paginationOptions = app.getPaginationOptions(request)
        const where = {
            ProjectId: request.project.id
        }
        const devices = await app.db.models.Device.getAll(paginationOptions, where)
        devices.devices = devices.devices.map(d => app.db.views.Device.deviceSummary(d))
        reply.send(devices)
    })

    app.get('/settings', async (request, reply) => {
        const deviceSettings = await request.project.getSetting('deviceSettings') || {
            targetSnapshot: null
        }
        if (deviceSettings.targetSnapshot) {
            deviceSettings.targetSnapshot = app.db.models.ProjectSnapshot.encodeHashid(deviceSettings.targetSnapshot)
        }
        reply.send(deviceSettings)
    })

    app.post('/settings', async (request, reply) => {
        if (request.body.targetSnapshot) {
            // We currently only have `targetSnapshot` under deviceSettings.
            // For now, only care about that - when we add other device settings, this
            // will need to be rewritten

            const targetSnapshot = await app.db.models.ProjectSnapshot.byId(request.body.targetSnapshot)

            if (!targetSnapshot) {
                reply.code(400).send({ error: 'Invalid snapshot' })
                return
            }
            if (targetSnapshot.ProjectId !== request.project.id) {
                reply.code(400).send({ error: 'Invalid snapshot' })
                return
            }

            await request.project.updateSetting('deviceSettings', {
                targetSnapshot: targetSnapshot.id
            })
            // Update the targetSnapshot of the devices assigned to this project
            await app.db.models.Device.update({ targetSnapshotId: targetSnapshot.id }, {
                where: {
                    ProjectId: request.project.id
                }
            })
            await app.db.controllers.AuditLog.projectLog(
                request.project.id,
                request.session.User.id,
                'project.snapshot.deviceTarget',
                { id: request.body.targetSnapshot }
            )
            if (app.comms) {
                app.comms.devices.sendCommandToProjectDevices(request.project.Team.hashid, request.project.id, 'update', {
                    snapshot: targetSnapshot.hashid
                })
            }
            reply.send({ status: 'okay' })
        }
    })
}
