/**
 * Project Action api routes
 *
 * request.project will be defined for any route defined in here
 *
 * - /api/v1/project/:projectId/actions/
 *
 * @namespace project
 * @memberof forge.routes.api
 */
 module.exports = async function(app) {

    app.post('/start', async (request, reply) => {
        const result = await app.containers.start(request.project.id);
        await app.db.controllers.AuditLog.projectLog(
            request.project.id,
            request.session.User.id,
            "project.started"
        )
        reply.send(result)
    });

    app.post('/stop', async (request, reply) => {
        const result = await app.containers.stop(request.project.id);
        await app.db.controllers.AuditLog.projectLog(
            request.project.id,
            request.session.User.id,
            "project.stopped"
        )
        reply.send(result)
    });

    app.post('/restart', async (request, reply) => {
        const result = await app.containers.restart(request.project.id);
        await app.db.controllers.AuditLog.projectLog(
            request.project.id,
            request.session.User.id,
            "project.restarted"
        )
        reply.send(result)
    });

}
