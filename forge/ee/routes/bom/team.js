const teamShared = require('../../../routes/api/shared/team.js')

module.exports = async function (app) {
    app.addHook('preHandler', teamShared.defaultPreHandler.bind(null, app))

    app.get('/:teamId/bom', {
        preHandler: app.needsPermission('team:bom'),
        schema: {
            summary: 'Get team BOM',
            tags: ['Teams'],
            params: {
                type: 'object',
                properties: {
                    teamId: { type: 'string' }
                }
            },
            response: {
                200: {
                    type: 'array',
                    items: {
                        $ref: 'ApplicationBom'
                    }
                },
                '4xx': {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        const teamType = await request.team.getTeamType()
        if (!teamType.getFeatureProperty('bom', false)) {
            return reply.code(404).send({ code: 'unexpected_error', error: 'Feature not enabled.' })
        }
        const applications = await app.db.models.Application.byTeam(request.params.teamId)
        const results = []
        for (const application of applications) {
            const dependants = await application.getChildren({ includeDependencies: true })
            const childrenView = dependants.map(child => app.db.views.BOM.dependant(child.model, child.dependencies))
            const result = {
                id: application.hashid,
                name: application.name,
                children: childrenView
            }
            results.push(result)
        }
        const duplicateValues = (arr, n) => arr.flatMap(item => Array(n).fill(item))
        reply.send(duplicateValues(results, 500))
    })
}
