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
            const result = app.db.views.Project.teamProjectList(projects);
            reply.send({
                count: result.length,
                projects:result
            })
            reply.send(result)
        } else {
            reply.code(404).type('text/html').send('Not Found')
        }
    })

    app.post('/', {
        schema: {
            body: {
                type: 'object',
                required: ['name'],
                properties: {
                    name: { type: 'string' },
                    slug: { type: 'string' }
                }
            }
        }
    }, async (request, reply) => {
        // TODO check license allows multiple teams

        if (request.body.slug === "create") {
            reply.code(400).send({error:"slug not available"});
            return
        }

        try {
            const newTeam = await app.db.models.Team.create({
                name: request.body.name,
                slug: request.body.slug
            });
            await newTeam.addUser(request.session.User, { through: { role:"owner" } });

            const team = await app.db.models.Team.bySlug(newTeam.slug)
            reply.send(app.db.views.Team.team(team))
        } catch(err) {
            let responseMessage;
            if (err.errors) {
                responseMessage = err.errors.map(err => err.message).join(",");
            } else {
                responseMessage = err.toString();
            }
            reply.code(400).send({error:responseMessage})
        }
    });

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
