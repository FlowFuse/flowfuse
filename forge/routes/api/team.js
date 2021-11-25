const TeamMembers = require("./teamMembers.js");
const TeamInvitations = require("./teamInvitations.js");
/**
 * Team api routes
 *
 * - /api/v1/teams
 *
 * @namespace team
 * @memberof forge.routes.api
 */
module.exports = async function(app) {


    app.addHook('preHandler', async (request, reply) => {
        if (request.params.teamId) {
            try {
                request.team = await app.db.models.Team.byId(request.params.teamId)
                if (!request.team) {
                    reply.code(404).type('text/html').send('Not Found')
                }
            } catch(err) {
                reply.code(404).type('text/html').send('Not Found')
            }
        }
    })

    app.register(TeamMembers, { prefix: "/:teamId/members" })
    app.register(TeamInvitations, { prefix: "/:teamId/invitations" })

    /**
     * Get the details of a team
     * @name /api/v1/teams
     * @static
     * @memberof forge.routes.api.team
     */
    app.get('/:teamId', async (request, reply) => {
        reply.send(app.db.views.Team.team(request.team))
    })

    /**
     * Get the details of a team - using ?slug=:slug
     * @name /api/v1/teams
     * @static
     * @memberof forge.routes.api.team
     */
    app.get('/', async (request, reply) => {
        if (request.query.slug) {
            const team = await app.db.models.Team.bySlug(request.query.slug)
            if (team) {
                reply.send(app.db.views.Team.team(team))
                return;
            }
        }
        reply.code(404).type('text/html').send('Not Found')
    })

    app.get('/:teamId/projects', async (request, reply) => {
        const projects = await app.db.models.Project.byTeam(request.params.teamId)
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

            await app.db.controllers.AuditLog.teamLog(
                newTeam.id,
                request.session.User.id,
                "team.created"
            )
            await app.db.controllers.AuditLog.teamLog(
                newTeam.id,
                request.session.User.id,
                "user.added",
                {role: "owner"}
            )

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


    app.put('/:teamId', async (request, reply) => {
        try {
            if (request.body.name) {
                request.team.name = request.body.name;
            }
            if (request.body.slug) {
                request.team.slug = request.body.slug;
            }
            await request.team.save()
            reply.send(app.db.views.Team.team(request.team))
        }catch(err) {
            let responseMessage;
            if (err.errors) {
                responseMessage = err.errors.map(err => err.message).join(",");
            } else {
                responseMessage = err.toString();
            }
            reply.code(400).send({error:responseMessage})
        }

    });

    /**
     * Get the session users team membership
     * @name /api/v1/team/:teamId/user
     * @static
     * @memberof forge.routes.api.team
     */
    app.get('/:teamId/user', async (request, reply) => {
        const sessionUserMembership = await request.session.User.getTeamMembership(request.team.id);
        if (sessionUserMembership) {
            reply.send({
                role: sessionUserMembership.role
            })
        }
        reply.code(404).type('text/html').send('Not Found')
    })

    /**
     *
     * @name /api/v1/team/:teamId/audit-log
     * @memberof forge.routes.api.project
     */
    app.get('/:teamId/audit-log', async(request,reply) => {
        const paginationOptions = app.getPaginationOptions(request)
        const logEntries = await app.db.models.AuditLog.forTeam(request.team.id, paginationOptions)
        const result = app.db.views.AuditLog.auditLog(logEntries);
// console.log(logEntries);
        reply.send(result)
    })

}
