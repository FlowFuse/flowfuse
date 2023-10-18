/**
 * Application Tag api routes
 *
 * - /api/v1/applications/:applicationId/tags
 *
 * @namespace application
 * @memberof forge.routes.api
 */
module.exports = async function (app) {
    // ### Routes in this file
    // GET /api/v1/applications/:applicationId/tags/list - Get a list of tags usable by this application
    //
    // ### FUTURE:
    // GET /api/v1/applications/:applicationId/tags - list tags assigned to an application
    // POST /api/v1/applications/:applicationId/tags - add an application tag
    // > body: { tagTypeId, teamId, name, [applicationId, description, color, icon }
    // PUT /api/v1/applications/:applicationId/tags/:tagId - update an application tag
    // > body: { tagTypeId, teamId, name, [applicationId, description, color, icon }
    // GET /api/v1/applications/:applicationId/tags/:tagId - get a single tag assigned to an application
    // PATCH /api/v1/applications/:applicationId/tags:tagId - assign a tag to an application
    // DELETE /api/v1/applications/:applicationId/tags/:tagId - unassign a tag from an application
    // Tag deletion is handled by the DELETE /api/v1/tags/:tagId route

    /**
     * Get a list of tags usable by this application
     * @name /api/v1/application/:applicationId/tags/list
     * @static
     * @memberof forge.routes.api.application
     */
    app.get('/list', {
        // preHandler: app.needsPermission('team:tag:list') // TODO: generate permission
        // schema: { } // FUTURE: when api fully implemented, stable and ready to be documented
    }, async (request, reply) => {
        const paginationOptions = app.getPaginationOptions(request)

        const teamId = request.application.TeamId
        const tags = await app.db.models.Tag.forApplication(teamId, request.application.id, paginationOptions)

        const result = app.db.views.Tag.applicationTagsList(tags?.tags || [])
        reply.send({
            meta: {}, // For future pagination
            count: result.length,
            tags: result
        })
    })
}
