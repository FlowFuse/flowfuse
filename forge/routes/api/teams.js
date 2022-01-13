/**
 * Teams api routes
 *
 * - /api/v1/teams
 *
 * @namespace teams
 * @memberof forge.routes.api
 */
module.exports = async function(app) {

    // Lets assume all apis that access bulk teams are admin only.
    app.addHook('preHandler',app.verifyAdmin);

    /**
     * Get a list of all known users
     * @name /api/v1/teams
     * @static
     * @memberof forge.routes.api.teams
     */
    app.get('/', async (request, reply) => {
        const paginationOptions = app.getPaginationOptions(request)
        const teams = await app.db.models.Team.getAll(paginationOptions);
        teams.teams = users.users.map(u => app.db.views.User.userProfile(u))
        reply.send(teams);
    })
}
