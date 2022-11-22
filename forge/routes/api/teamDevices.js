// const { Roles } = require('../../lib/roles.js')

/**
 * Team Devices api routes
 *
 * - /api/v1/teams/:teamId/devices
 *
 * By the time these handlers are invoked, :teamApi will have been validated
 * and 404'd if it doesn't exist. `request.team` will contain the team object
 *
 * @namespace teamDevices
 * @memberof forge.routes.api
 */
module.exports = async function (app) {
    // app.addHook('preHandler', async (request, reply) => {
    //     if (request.params.userId) {
    //         try {
    //             if (request.session.User.id === request.params.userId) {
    //                 // Don't need to lookup the user/role again
    //                 request.user = request.session.User
    //                 request.userRole = request.teamMembership
    //             } else {
    //                 request.user = await app.db.models.User.byId(request.params.userId)
    //                 if (!request.user) {
    //                     reply.code(404).send({ code: 'not_found', error: 'Not Found' })
    //                     return
    //                 }
    //                 request.userRole = await request.user.getTeamMembership(request.params.teamId)
    //             }
    //         } catch (err) {
    //             console.log(err)
    //             reply.code(404).send({ code: 'not_found', error: 'Not Found' })
    //         }
    //     }
    // })

    /**
     * Get a list of devices owned by this team
     * @name /api/v1/team/:teamId/devices
     * @static
     * @memberof forge.routes.api.team
     */
    app.get('/', {
        preHandler: app.needsPermission('team:device:list')
    }, async (request, reply) => {
        const paginationOptions = app.getPaginationOptions(request)
        const where = {
            TeamId: request.team.id
        }
        const devices = await app.db.models.Device.getAll(paginationOptions, where)
        devices.devices = devices.devices.map(d => app.db.views.Device.deviceSummary(d))
        reply.send(devices)
    })
}
