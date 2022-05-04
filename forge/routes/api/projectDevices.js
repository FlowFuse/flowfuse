// const { Roles } = require('../../lib/roles.js')

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
            projectId: request.project.id
        }
        const devices = await app.db.models.Device.getAll(paginationOptions, where)
        devices.devices = devices.devices.map(d => app.db.views.Device.deviceSummary(d))
        reply.send(devices)
    })
}
