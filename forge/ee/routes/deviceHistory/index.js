const deviceShared = require('../../../routes/api/shared/device.js')

module.exports = async function (app) {
    app.addHook('preHandler', deviceShared.defaultPreHandler.bind(null, app))
    app.addHook('preHandler', async (request, reply) => {
        const id = request.device?.Team?.id
        const team = await app.db.models.Team.byId(id)
        if (team) {
            request.team = team
            // Check this feature is enabled for this team type.
            if (team.TeamType.getFeatureProperty('deviceHistory', true)) {
                return
            }
        }
        reply.code(404).send({ code: 'not_found', error: 'Not Found' })
    })
    /**
     * Get device history
     *  - returns a timeline of changes to the device
     *  - ?cursor= can be used to set the 'most recent log entry' to query from
     *  - ?limit= can be used to modify how many entries to return
     * @name /api/v1/devices/:id/history
     * @memberof forge.routes.api.devices
     */
    app.get('/', {
        preHandler: app.needsPermission('device:history'),
        schema: {
            summary: 'Get Device history',
            hide: true, // mark as explicitly hidden (internal for now)
            tags: [/* 'Devices' */], // no tag hides route from swagger (internal for now)
            params: {
                type: 'object',
                properties: {
                    deviceId: { type: 'string' }
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
        const logEntries = await app.db.models.AuditLog.forTimelineHistory(
            request.device.id,
            'device',
            paginationOptions
        )
        const timelineView = app.db.views.AuditLog.timelineList(logEntries?.timeline || [])
        reply.send({
            meta: logEntries.meta,
            count: timelineView.length,
            timeline: timelineView
        })
    })
}
