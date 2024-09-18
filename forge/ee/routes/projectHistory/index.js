const projectShared = require('../../../routes/api/shared/project.js')

module.exports = async function (app) {
    app.addHook('preHandler', projectShared.defaultPreHandler.bind(null, app))
    /**
     * Get project history
     *  - returns a timeline of changes to the project
     *  - ?cursor= can be used to set the 'most recent log entry' to query from
     *  - ?limit= can be used to modify how many entries to return
     * @name /api/v1/projects/:id/history
     * @memberof forge.routes.api.project
     */
    app.get('/', {
        preHandler: app.needsPermission('project:history'),
        schema: {
            summary: 'Get instance history',
            tags: ['Instances'],
            params: {
                type: 'object',
                properties: {
                    instanceId: { type: 'string' }
                }
            },
            query: {
                $ref: 'PaginationParams'
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        meta: { $ref: 'PaginationMeta' },
                        count: { type: 'number' },
                        timeline: { $ref: 'TimelineList' }
                    }
                },
                '4xx': {
                    $ref: 'APIError'
                },
                500: {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        const paginationOptions = app.getPaginationOptions(request)
        const logEntries = await app.db.models.AuditLog.forProjectHistory(request.project.id, paginationOptions)
        const timelineView = app.db.views.AuditLog.timelineList(logEntries?.timeline || [])
        reply.send({
            meta: logEntries.meta,
            count: timelineView.length,
            timeline: timelineView
        })
    })
}
