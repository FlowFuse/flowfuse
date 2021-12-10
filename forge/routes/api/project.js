const ProjectActions = require("./projectActions.js");

/**
 * Instance api routes
 *
 * - /api/v1/project
 *
 * - Any route that has a :projectId parameter will:
 *    - Ensure the session user is either admin or has a role on the corresponding team
 *    - request.project prepopulated with the team object
 *    - request.teamMembership prepopulated with the user role ({role: XYZ})
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
                 if (request.session.User) {
                     request.teamMembership = await request.session.User.getTeamMembership(request.project.Team.id);
                     if (!request.teamMembership && !request.session.User.admin) {
                         reply.code(404).type('text/html').send('Not Found')
                     }
                 } else if (request.session.ownerId !== request.params.projectId) {
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
        preHandler: app.needsPermission("project:create"),
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
                type: request.body.options.type || "basic",
                url: "placeholder"
            })
            const authClient = await app.db.controllers.AuthClient.createClientForProject(project);
            const projectToken = await app.db.controllers.AccessToken.createTokenForProject(project, null, ["project:flows:view","project:flows:edit"])
            const containerOptions = {
                name: request.body.name,
                storageURL: process.env['BASE_URL'] + "/storage",
                projectToken: projectToken.token,
                auditURL: process.env['BASE_URL'] + "/logging",
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
    app.delete('/:projectId', { preHandler: app.needsPermission("project:delete") }, async (request, reply) => {
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

    app.put('/:projectId', { preHandler: app.needsPermission("project:edit") }, async (request, reply) => {
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
     * Provide Project specific settings.js
     *
     * @name /api/v1/project/:id/settings
     * @memberof forge.routes.api.project
     */
    app.get('/:projectId/settings', async(request,reply) => {
        let settings = await app.containers.settings(request.project.id);
        settings.state = request.project.state
        reply.send(settings)
    })


    /**
     * Get project logs
     *  - returns most recent 30 entries
     *  - ?cursor= can be used to set the 'most recent log entry' to query from
     *  - ?limit= can be used to modify how many entries to return
     * @name /api/v1/project/:id/log
     * @memberof forge.routes.api.project
     */
    app.get('/:projectId/logs', async(request,reply) => {
        const paginationOptions = app.getPaginationOptions(request, {limit: 30})

        let logs = await app.containers.logs(request.project.id);
        let firstLogCursor = logs.length > 0?logs[0].ts:null;
        let fullLogLength = logs.length;
        if (!paginationOptions.cursor) {
            logs = logs.slice(-paginationOptions.limit);
        } else {
            let cursor = paginationOptions.cursor
            let cursorDirection = true; // 'next'
            if (cursor[0] === "-") {
                cursorDirection = false
                cursor = cursor.substring(1)
            }
            let i=0;
            for (;i<fullLogLength;i++) {
                if (logs[i].ts === cursor) {
                    break
                }
            }
            if (i === fullLogLength) {
                // cursor not found
                logs = []
            } else if (cursorDirection) {
                // logs *after* cursor
                logs = logs.slice(i+1,i+1+paginationOptions.limit)
            } else {
                // logs *before* cursor
                logs = logs.slice(Math.max(0,i-1-paginationOptions.limit),i)
            }
        }
        const result = {
            meta: {
                // next_cursor - are there more recent logs to get?
                next_cursor: logs.length > 0 ? logs[logs.length-1].ts:undefined,
                previous_cursor: logs.length > 0 && logs[0].ts != firstLogCursor ? ("-"+logs[0].ts):undefined
            },
            log: logs.map(l => l.msg)
        }
        reply.send(result)
    })


    /**
     *
     * @name /api/v1/project/:id/audit-log
     * @memberof forge.routes.api.project
     */
    app.get('/:projectId/audit-log',  { preHandler: app.needsPermission("project:audit-log") }, async(request,reply) => {
        const paginationOptions = app.getPaginationOptions(request)
        const logEntries = await app.db.models.AuditLog.forProject(request.project.id, paginationOptions)
        const result = app.db.views.AuditLog.auditLog(logEntries);
// console.log(logEntries);
        reply.send(result)
    })

}
