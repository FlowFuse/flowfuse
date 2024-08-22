const applicationShared = require('../../../routes/api/shared/application.js')

module.exports = async function (app) {
    app.addHook('preHandler', applicationShared.defaultPreHandler.bind(null, app))

    /**
     * Get the application BOM
     * @name /api/v1/application/:applicationId/bom
     * @memberof forge.routes.api.application
     */
    app.get('/:applicationId/bom', {
        preHandler: app.needsPermission('application:bom'),
        schema: {
            summary: 'Get application BOM',
            tags: ['Applications'],
            params: {
                type: 'object',
                properties: {
                    applicationId: { type: 'string' }
                }
            },
            response: {
                200: {
                    type: 'object',
                    $ref: 'ApplicationBom'
                },
                '4xx': {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        const dependants = await request.application.getChildren({ includeDependencies: true })
        const childrenView = dependants.map(child => app.db.views.BOM.dependant(child.model, child.dependencies))
        const result = {
            id: request.application.hashid,
            name: request.application.name,
            children: childrenView
        }
        reply.send(result)
    })
}
