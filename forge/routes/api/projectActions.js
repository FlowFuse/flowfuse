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
        if (request.project.state === 'suspended') {
            // Restart the container
            request.project.state = 'running'
            await request.project.save()
            app.db.controllers.Project.setInflightState(request.project, 'starting')
            const startResult = await app.containers.start(request.project)
            startResult.started.then(async () => {
                await app.db.controllers.AuditLog.projectLog(
                    request.project.id,
                    request.session.User.id,
                    'project.started'
                )
                app.db.controllers.Project.clearInflightState(request.project)
            })
        } else {
            app.db.controllers.Project.setInflightState(request.project, 'starting')
            request.project.state = 'running'
            await request.project.save()
            await app.containers.startFlows(request.project)
            await app.db.controllers.AuditLog.projectLog(
                request.project.id,
                request.session.User.id,
                'project.started'
            )
            app.db.controllers.Project.clearInflightState(request.project)
        }
        reply.send()
    })

    app.post('/stop', async (request, reply) => {
        if (request.project.state === 'suspended') {
            reply.code(400).send({ error: 'Project suspended' })
            return
        }
        app.db.controllers.Project.setInflightState(request.project, 'stopping')
        request.project.state = 'stopped'
        await request.project.save()
        const result = await app.containers.stopFlows(request.project)
        await app.db.controllers.AuditLog.projectLog(
            request.project.id,
            request.session.User.id,
            'project.stopped'
        )
        app.db.controllers.Project.clearInflightState(request.project)
        reply.send(result)
    })

    app.post('/restart', async (request, reply) => {
        if (request.project.state === 'suspended') {
            reply.code(400).send({ error: 'Project suspended' })
            return
        }
        app.db.controllers.Project.setInflightState(request.project, 'restarting')
        request.project.state = 'running'
        await request.project.save()
        const result = await app.containers.restartFlows(request.project)
        await app.db.controllers.AuditLog.projectLog(
            request.project.id,
            request.session.User.id,
            'project.restarted'
        )
        app.db.controllers.Project.clearInflightState(request.project)
        reply.send(result)
    })

    app.post('/suspend', async (request, reply) => {
        if (request.project.state === 'suspended') {
            reply.code(400).send({ error: 'Project suspended' })
            return
        }
        app.db.controllers.Project.setInflightState(request.project, 'suspending')
        await app.containers.stop(request.project)
        app.db.controllers.Project.clearInflightState(request.project)
        await app.db.controllers.AuditLog.projectLog(
            request.project.id,
            request.session.User.id,
            'project.suspended'
        )
        reply.send()
    })
}
