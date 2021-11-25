const ProjectActions = require("./projectActions.js");

/**
 * Instance api routes
 *
 * - /api/v1/project
 *
 * - Any route that has a :projectId parameter will:
 *    - Ensure the session user is either admin or has a role on the corresponding team
 *    - request.project prepopulated with the team object
 *    - request.teamMembership prepopulated with the user role ({role: "member"})
 *      (unless they are admin)
 *
 * @namespace project
 * @memberof forge.routes.api
 */
 module.exports = async function(app) {

     app.addHook('preHandler', async (request, reply) => {
         if (request.params.projectId) {
             try {
                 request.project = await app.db.models.Project.byId(request.params.projectId)
                 if (!request.project) {
                     reply.code(404).type('text/html').send('Not Found')
                 }
                 request.teamMembership = await request.session.User.getTeamMembership(request.project.Team.id);
                 if (!request.teamMembership && !request.session.User.admin) {
                     reply.code(404).type('text/html').send('Not Found')
                 }
             } catch(err) {
                 reply.code(404).type('text/html').send('Not Found')
             }
         }
     })

     app.register(ProjectActions, { prefix: "/:projectId/actions" })

    /**
     * Get the details of a given project
     * @name /api/v1/project/:projectId
     * @static
     * @memberof forge.routes.api.project
     */
    app.get('/:projectId', async (request, reply) => {
        const result = await app.db.views.Project.project(request.project);
        result.meta = await app.containers.details(request.project.id)  || { state:'unknown'}
        result.team = await app.db.views.Team.team(request.project.Team);
        reply.send(result)
    })

    /**
     * Create an new project
     * @name /api/v1/project
     * @memberof forge.routes.api.project
     */
    app.post('/', {
        schema: {
            body: {
                type: 'object',
                required: ['name','options', 'team'],
                properties: {
                    name: { type: 'string' },
                    team: { type: ['string', 'number'] },
                    options: { type: 'object'}
                }
            }
        }
    }, async (request, reply) => {
        const teamMembership = await request.session.User.getTeamMembership(request.body.team, true);
        // Assume membership is enough to allow project creation.
        // If we have roles that limit creation, that will need to be checked here.
        if (teamMembership) {
            const team = teamMembership.get('Team');
            const project = await app.db.models.Project.create({
                name: request.body.name,
                type: request.body.options.type,
                url: "placeholder"
            })
            const authClient = await app.db.controllers.AuthClient.createClientForProject(project);

            const containerOptions = {
                name: request.body.name,
                storageURL: process.env['BASE_URL'] + "/storage",
                storageToken: "aaaa",
                ...request.body.options,
                ...authClient
            }

            await team.addProject(project);
            const container = await app.containers.create(project.id, containerOptions);

            project.url = container.url
            await project.save()

            await app.db.controllers.AuditLog.projectLog(
                project.id,
                request.session.User.id,
                "project.created"
            )
            await app.db.controllers.AuditLog.teamLog(
                team.id,
                request.session.User.id,
                "project.created",
                { id: project.id, name: project.name }
            )

            const result = await app.db.views.Project.project(project);
            result.meta = await app.containers.details(project.id);
            result.team = team.id;
            reply.send(result);
        } else {
            reply.status(401).send({error: "Current user not in team " + request.body.team})
        }
    })
    /**
     * Delete an project
     * @name /api/v1/project/:id
     * @memberof forge.routes.api.project
     */
    app.delete('/:projectId', async (request, reply) => {
        try {
            await app.containers.remove(request.project.id)
            request.project.destroy();
            await app.db.controllers.AuditLog.projectLog(
                request.project.id,
                request.session.User.id,
                "project.deleted"
            )
            await app.db.controllers.AuditLog.teamLog(
                request.project.Team.id,
                request.session.User.id,
                "project.deleted"
            )
            reply.send({ status: "okay"});
        } catch(err) {
            console.log("missing", err)
            console.log(err)
            reply.status(500).send({})
        }

    })

    app.put('/:projectId', async (request, reply) => {
        if (request.body.name) {
            request.project.name = request.body.name;
        }
        await request.project.save()

        const result = await app.db.views.Project.project(request.project);
        result.meta = await app.containers.details(request.project.id)  || { state:'unknown'}
        result.team = await app.db.views.Team.team(request.project.Team);
        reply.send(result)

    });

    /**
     * Send commands
     *
     * e.g. start/stop/restart
     *
     * @name /api/v1/project/:id
     * @memberof forge.routes.api.project
     */
    app.post('/:projectId', async (request,reply) => {
        let meta = await app.containers.details(request.project.name)
        reply.send({})
    })

    /**
     * Provide Project specific settings.js
     *
     * @name /api/v1/project/:id/settings
     * @memberof forge.routes.api.project
     */
    app.get('/:projectId/settings', async(request,reply) => {
        let settings = await app.containers.settings(request.project.id);
        reply.send(settings)
    })

    /**
     *
     * @name /api/v1/project/:id/audit-log
     * @memberof forge.routes.api.project
     */
    app.get('/:projectId/audit-log', async(request,reply) => {
        const paginationOptions = app.getPaginationOptions(request)
        const logEntries = await app.db.models.AuditLog.forProject(request.project.id, paginationOptions)
        const result = app.db.views.AuditLog.auditLog(logEntries);
// console.log(logEntries);
        reply.send(result)
    })

}
