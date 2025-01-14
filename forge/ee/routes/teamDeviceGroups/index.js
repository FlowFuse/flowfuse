/**
 * Team DeviceGroup api routes
 *
 * - /api/v1/teams/:teamId/device-groups
 *
 * @namespace teams
 * @memberof forge.routes.api
 */

// const { ValidationError } = require('sequelize')
//
// const { UpdatesCollection } = require('../../../auditLog/formatters.js')
// const { Roles } = require('../../../lib/roles.js')
// const { DeviceGroupMembershipValidationError } = require('../../db/controllers/DeviceGroup.js')
//
// // Declare getLogger function to provide type hints / quick code nav / code completion
// /** @type {import('../../../../forge/auditLog/application').getLoggers} */
// const getApplicationLogger = (app) => { return app.auditLog.Application }

/**
 * @param {import('../../../forge.js').ForgeApplication} app The application instance
 */
module.exports = async function (app) {
    // pre-handler for all routes in this file
    app.addHook('preHandler', async (request, reply) => {
        // todo validation preHandler
        // // Get the application
        // const applicationId = request.params.applicationId
        // if (!applicationId) {
        //     return reply.code(404).send({ code: 'not_found', error: 'Not Found' })
        // }
        //
        // try {
        //     request.application = await app.db.models.Application.byId(applicationId)
        //     if (!request.application) {
        //         return reply.code(404).send({ code: 'not_found', error: 'Not Found' })
        //     }
        //
        //     if (request.session.User) {
        //         request.teamMembership = await request.session.User.getTeamMembership(request.application.Team.id)
        //         if (!request.teamMembership && !request.session.User.admin) {
        //             return reply.code(404).send({ code: 'not_found', error: 'Not Found' })
        //         }
        //     }
        //
        //     const teamType = await request.application.Team.getTeamType()
        //     if (!teamType.getFeatureProperty('deviceGroups', false)) {
        //         return reply.code(404).send({ code: 'not_found', error: 'Not Found' })
        //     }
        // } catch (err) {
        //     return reply.code(500).send({ code: 'unexpected_error', error: err.toString() })
        // }
        //
        // // Get the device group
        // const groupId = request.params.groupId
        // if (groupId) {
        //     request.deviceGroup = await app.db.models.DeviceGroup.byId(groupId)
        //     if (!request.deviceGroup || request.deviceGroup.ApplicationId !== request.application.id) {
        //         reply.code(404).send({ code: 'not_found', error: 'Not Found' })
        //     }
        // }
    })

    /**
     * Get a list of team device groups
     * @method GET
     * @name /api/v1/teams/:teamId/device-groups
     * @memberof forge.routes.api.application
     */
    app.get('/', {
        preHandler: app.needsPermission('application:device-group:list'),
        schema: {
            summary: 'Get a list of device groups in an application',
            tags: ['Application Device Groups'],
            query: { $ref: 'PaginationParams' },
            params: {
                type: 'object',
                properties: {
                    applicationId: { type: 'string' }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        meta: { $ref: 'PaginationMeta' },
                        count: { type: 'number' },
                        groups: { type: 'array', items: { $ref: 'DeviceGroupSummary' } }
                    }
                },
                '4xx': {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        reply.send({
            meta: {},
            count: 0,
            groups: []
        })
        // const paginationOptions = app.db.controllers.Device.getDevicePaginationOptions(request)
        //
        // const where = {
        //     ApplicationId: request.application.hashid
        // }
        //
        // const groupData = await app.db.models.DeviceGroup.getAll(paginationOptions, where)
        // const result = {
        //     count: groupData.count,
        //     meta: groupData.meta,
        //     groups: (groupData.groups || []).map(d => app.db.views.DeviceGroup.deviceGroupSummary(d, { includeApplication: false }))
        // }
        // reply.send(result)
    })
}
