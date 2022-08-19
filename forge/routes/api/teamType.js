/**
 * Team Type api routes
 *
 * - /api/v1/team-types
 *
 * @namespace teamTypes
 * @memberof forge.routes.api
 */
module.exports = async function (app) {
    /**
     * Get a list of available team types
     * @name /api/v1/team-types/
     * @static
     * @memberof forge.routes.api.teamTypes
     */
    app.get('/', async (request, reply) => {
        const paginationOptions = app.getPaginationOptions(request)
        const teamTypes = await app.db.models.TeamType.getAll(paginationOptions, { enabled: true })
        teamTypes.types = teamTypes.types.map(pt => app.db.views.TeamType.teamType(pt))
        reply.send(teamTypes)
    })
}
