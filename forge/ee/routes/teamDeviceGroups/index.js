/**
 * Team DeviceGroup api routes
 *
 * - /api/v1/teams/:teamId/device-groups
 *
 * @namespace teams
 * @memberof forge.routes.api
 */

/**
 * @param {import('../../../forge.js').ForgeApplication} app The application instance
 */
module.exports = async function (app) {
    // pre-handler for all routes in this file
    app.addHook('preHandler', async (request, reply) => {
        // Get the team
        const teamId = request.params.teamId
        if (!teamId) {
            return reply.code(404).send({ code: 'not_found', error: 'Not Found' })
        }

        try {
            request.team = await app.db.models.Team.byId(request.params.teamId)
            if (!request.team) {
                return reply.code(404).send({ code: 'not_found', error: 'Not Found' })
            }

            if (request.session.User) {
                request.teamMembership = await request.session.User.getTeamMembership(request.team.id)
                if (!request.teamMembership && !request.session.User.admin) {
                    return reply.code(404).send({ code: 'not_found', error: 'Not Found' })
                }
            }

            const teamType = await request.team.getTeamType()
            if (!teamType.getFeatureProperty('deviceGroups', false)) {
                return reply.code(404).send({ code: 'not_found', error: 'Not Found' })
            }
        } catch (err) {
            return reply.code(500).send({ code: 'unexpected_error', error: err.toString() })
        }
    })

    /**
     * Get a list of team device groups
     * @method GET
     * @name /api/v1/teams/:teamId/device-groups
     * @memberof forge.routes.api.team
     */
    app.get('/', {
        preHandler: app.needsPermission('team:device-group:list'),
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
        const paginationOptions = app.db.controllers.Device.getDevicePaginationOptions(request)

        const applications = await app.db.models.Application.byTeam(request.team.id)

        const where = {
            ApplicationId: applications.map(app => app.dataValues.id)
        }

        const groupData = await app.db.models.DeviceGroup.getAll(paginationOptions, where, { includeApplication: true })
        const result = {
            count: groupData.count,
            meta: groupData.meta,
            groups: (groupData.groups || []).map(d => app.db.views.DeviceGroup.deviceGroupSummary(d, { includeApplication: true }))
        }

        reply.send(result)
    })
}
