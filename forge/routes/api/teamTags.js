/**
 * Team Tag api routes
 *
 * - /api/v1/teams/:teamId/tags
 *
 * By the time these handlers are invoked, :teamApi will have been validated
 * and 404'd if it doesn't exist. `request.team` will contain the team object
 *
 * @namespace teamMembers
 * @memberof forge.routes.api
 */
module.exports = async function (app) {
    // ### Routes in this file
    // GET /api/v1/teams/:teamId/tags/list - Get a list of tags usable by this team
    //
    // ### FUTURE:
    // GET /api/v1/teams/:teamId/tags - list tags assigned to a team
    // POST /api/v1/teams/:teamId/tags - add a team tag
    // > body: { tagTypeId, teamId, name, [teamId, description, color, icon }
    // PUT /api/v1/teams/:teamId/tags/:tagId - update a team tag
    // > body: { tagTypeId, teamId, name, [teamId, description, color, icon }
    // GET /api/v1/teams/:teamId/tags/:tagId - get a single tag assigned to a team
    // PATCH /api/v1/teams/:teamId/tags:tagId - assign a tag to a team
    // DELETE /api/v1/teams/:teamId/tags/:tagId - unassign a tag from a team
    // Tag deletion is handled by the DELETE /api/v1/tags/:tagId route

    /**
     * Get a list of tags usable by this team
     * @name /api/v1/team/:teamId/tags/list
     * @static
     * @memberof forge.routes.api.team
     */
    app.get('/list', {
        // preHandler: app.needsPermission('team:tag:list') // TODO: generate permission
        // schema: { } // FUTURE: when api is stable and ready to be documented
    }, async (request, reply) => {
        const paginationOptions = app.getPaginationOptions(request)

        const tags = await app.db.models.Tag.forTeam(request.params.teamId, paginationOptions)

        const tagsView = app.db.views.Tag.teamTagsList(tags?.tags || [])
        reply.send({
            meta: {}, // For future pagination
            count: tagsView.length,
            tags: tagsView
        })
    })
}
