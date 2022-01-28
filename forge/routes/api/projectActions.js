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
module.exports = async function (app) {
    app.addHook('preHandler', app.needsPermission('project:change-status'))

    app.post('/start', async (request, reply) => {
        request.project.state = 'running'
        await request.project.save()
        const result = await app.containers.start(request.project)
        await app.db.controllers.AuditLog.projectLog(
            request.project.id,
            request.session.User.id,
            'project.started'
        )
        reply.send(result)
    })

    app.post('/stop', async (request, reply) => {
        request.project.state = 'stopped'
        await request.project.save()
        const result = await app.containers.stop(request.project)
        await app.db.controllers.AuditLog.projectLog(
            request.project.id,
            request.session.User.id,
            'project.stopped'
        )
        reply.send(result)
    })

    app.post('/restart', async (request, reply) => {
        request.project.state = 'running'
        await request.project.save()
        const result = await app.containers.restart(request.project)
        await app.db.controllers.AuditLog.projectLog(
            request.project.id,
            request.session.User.id,
            'project.restarted'
        )
        reply.send(result)
    })
}
