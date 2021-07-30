/**
 * Team api routes
 *
 * - /api/v1/team
 *
 * @namespace user
 * @memberof forge.routes.api
 */
module.exports = async function(app) {

    /**
     * Get the details of a team
     * @name /api/v1/team
     * @static
     * @memberof forge.routes.api.team
     */
    app.get('/:id', async (request, reply) => {
        const team = await app.db.models.Team.bySlug(request.params.id)
        if (team) {
            reply.send(app.db.views.Team.team(team))
        } else {
            reply.code(404).type('text/html').send('Not Found')
        }
    })

    app.get('/:id/projects', async (request, reply) => {
        const projects = await app.db.models.Project.byTeam(request.params.id)
        if (projects) {
            reply.send(app.db.views.Project.teamProjectList(projects))
        } else {
            reply.code(404).type('text/html').send('Not Found')
        }
    })

    // app.get('/teams', async (request, reply) => {
    //     const teams = await app.db.models.Team.forUser(request.session.User);
    //     const result = await app.db.views.Team.teamList(teams);
    //     reply.send({
    //         count: result.length,
    //         teams:result
    //     })
    //
    //
    // })
}
