/**
 * Time-series configuration for Node-RED
 *
 * The QuestDB nodes call this with their instance or device token to auto-configure. It
 * returns the calling team's own server: the managed one (internal endpoints for hosted
 * instances, external endpoints and PgBouncer for devices), the external one the team owner
 * connected, or the shared server of the static driver.
 *
 * Only instance and device tokens get an answer, because the response holds credentials.
 *
 * @namespace timeseries
 * @memberof forge.ee.routes
 */
module.exports = async function (app) {
    app.get('/config', {
        schema: {
            summary: 'Get QuestDB connection configuration for the calling instance or device',
            hide: true,
            tags: ['Timeseries'],
            response: {
                200: {
                    type: 'object',
                    properties: {
                        available: { type: 'boolean' },
                        state: { type: 'string' },
                        ilp: { $ref: 'TimeseriesIlpConnection' },
                        pgwire: { $ref: 'TimeseriesPgwireConnection' }
                    }
                },
                '4xx': { $ref: 'APIError' }
            }
        },
        preHandler: async (request, reply) => {
            if (!app.config.features.enabled('timeseries') || !app.timeseries) {
                return reply.send({ available: false })
            }
            if (request.session.ownerType === 'project') {
                const project = await app.db.models.Project.byId(request.session.ownerId)
                if (!project) {
                    return reply.status(404).send({ code: 'not_found', error: 'Not Found' })
                }
                request.timeseriesTeam = project.Team
                request.timeseriesAudience = 'internal'
            } else if (request.session.ownerType === 'device') {
                const device = await app.db.models.Device.byId(parseInt(request.session.ownerId))
                if (!device) {
                    return reply.status(404).send({ code: 'not_found', error: 'Not Found' })
                }
                request.timeseriesTeam = device.Team
                request.timeseriesAudience = 'external'
            } else {
                return reply.status(403).send({ code: 'forbidden', error: 'Only instance and device tokens can read this' })
            }
            const team = request.timeseriesTeam
            await team.ensureTeamTypeExists()
            if (!team.getFeatureProperty('timeseries', false)) {
                return reply.send({ available: false })
            }
        }
    }, async (request, reply) => {
        reply.send(await app.timeseries.connectionForTeam(request.timeseriesTeam, request.timeseriesAudience))
    })
}
