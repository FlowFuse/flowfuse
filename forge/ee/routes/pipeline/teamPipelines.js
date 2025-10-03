const teamShared = require('../../../routes/api/shared/team.js')

module.exports = async function (app) {
    app.addHook('preHandler', teamShared.defaultPreHandler.bind(null, app))

    /**
     * List all pipelines within an Team
     * /api/v1/teams/:teamId/pipelines
     */
    app.get('/', {
        preHandler: app.needsPermission('team:pipeline:list'),
        schema: {
            summary: '',
            tags: ['Pipelines'],
            params: {
                type: 'object',
                properties: {
                    teamId: { type: 'string' }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        count: { type: 'number' },
                        pipelines: { $ref: 'PipelineList' }
                    }
                },
                '4xx': {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        let pipelines = await app.db.models.Pipeline.byTeamId(request.params.teamId)
        if (pipelines) {
            if (!request.session?.User?.admin && request.teamMembership && request.teamMembership.permissions?.applications) {
                pipelines = pipelines.filter(pipeline => {
                    return app.hasPermission(request.teamMembership, 'project:read', { applicationId: app.db.models.Application.encodeHashid(pipeline.ApplicationId) })
                })
            }
            reply.send({
                count: pipelines.length,
                pipelines: await app.db.views.Pipeline.teamPipelineList(pipelines)
            })
        } else {
            reply.code(404).send({ code: 'not_found', error: 'Not Found' })
        }
    })
}
