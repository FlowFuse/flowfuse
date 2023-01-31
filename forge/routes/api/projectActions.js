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
    const changeStatusPreHandler = { preHandler: app.needsPermission('project:change-status') }

    app.post('/start', changeStatusPreHandler, async (request, reply) => {
        try {
            if (request.project.state === 'suspended') {
                if (app.license.active() && app.billing) {
                    if (!await app.billing.isProjectStartAllowed(request.project.Team, request.project)) {
                        reply.code(402).send({ code: 'billing_required', error: 'Team billing not configured' })
                        return
                    }
                }

                // Restart the container
                request.project.state = 'running'
                await request.project.save()
                app.db.controllers.Project.setInflightState(request.project, 'starting')
                const startResult = await app.containers.start(request.project)
                startResult.started.then(async () => {
                    await app.auditLog.Project.project.started(request.session.User, null, request.project)
                    app.db.controllers.Project.clearInflightState(request.project)
                })
            } else {
                app.db.controllers.Project.setInflightState(request.project, 'starting')
                request.project.state = 'running'
                await request.project.save()
                await app.containers.startFlows(request.project)
                await app.auditLog.Project.project.started(request.session.User, null, request.project)
                app.db.controllers.Project.clearInflightState(request.project)
            }
            reply.send()
        } catch (err) {
            app.db.controllers.Project.clearInflightState(request.project)

            const resp = { code: 'unexpected_error', error: err.toString() }
            await app.auditLog.Project.project.started(request.session.User, resp, request.project)
            reply.code(500).send(resp)
        }
    })

    app.post('/stop', changeStatusPreHandler, async (request, reply) => {
        try {
            if (request.project.state === 'suspended') {
                reply.code(400).send({ code: 'project_suspended', error: 'Project suspended' })
                return
            }
            app.db.controllers.Project.setInflightState(request.project, 'stopping')
            request.project.state = 'stopped'
            await request.project.save()
            const result = await app.containers.stopFlows(request.project)
            await app.auditLog.Project.project.stopped(request.session.User, null, request.project)
            app.db.controllers.Project.clearInflightState(request.project)
            reply.send(result)
        } catch (err) {
            app.db.controllers.Project.clearInflightState(request.project)

            const resp = { code: 'unexpected_error', error: err.toString() }
            await app.auditLog.Project.project.stopped(request.session.User, resp, request.project)
            reply.code(500).send(resp)
        }
    })

    app.post('/restart', changeStatusPreHandler, async (request, reply) => {
        try {
            if (request.project.state === 'suspended') {
                reply.code(400).send({ code: 'project_suspended', error: 'Project suspended' })
                return
            }
            app.db.controllers.Project.setInflightState(request.project, 'restarting')
            request.project.state = 'running'
            await request.project.save()
            const result = await app.containers.restartFlows(request.project)
            await app.auditLog.Project.project.restarted(request.session.User, null, request.project)
            app.db.controllers.Project.clearInflightState(request.project)
            reply.send(result)
        } catch (err) {
            app.db.controllers.Project.clearInflightState(request.project)

            const resp = { code: 'unexpected_error', error: err.toString() }
            await app.auditLog.Project.project.restarted(request.session.User, resp, request.project)
            reply.code(500).send(resp)
        }
    })

    app.post('/suspend', changeStatusPreHandler, async (request, reply) => {
        try {
            if (request.project.state === 'suspended') {
                reply.code(400).send({ code: 'project_suspended', error: 'Project suspended' })
                return
            }
            app.db.controllers.Project.setInflightState(request.project, 'suspending')
            await app.containers.stop(request.project)
            app.db.controllers.Project.clearInflightState(request.project)
            await app.auditLog.Project.project.suspended(request.session.User, null, request.project)
            reply.send()
        } catch (err) {
            app.db.controllers.Project.clearInflightState(request.project)

            const resp = { code: 'unexpected_error', error: err.toString() }
            await app.auditLog.Project.project.suspended(request.session.User, resp, request.project)
            reply.code(500).send(resp)
        }
    })

    app.post('/rollback', { preHandler: app.needsPermission('project:snapshot:rollback') }, async (request, reply) => {
        let restartProject = false
        try {
            // get (and check) snapshot is valid / owned by project before any actions
            const snapshot = await app.db.models.ProjectSnapshot.byId(request.body.snapshot)
            if (!snapshot) {
                reply.code(400).send({ code: 'invalid_snapshot', error: `snapshot '${request.body.snapshotId}' not found for project '${request.project.id}'` })
                return
            }
            if (snapshot.ProjectId !== request.project.id) {
                reply.code(400).send({ code: 'invalid_snapshot', error: `snapshot '${request.body.snapshotId}' not found for project '${request.project.id}'` })
                return
            }
            if (request.project.state === 'running') {
                restartProject = true
            }
            app.db.controllers.Project.setInflightState(request.project, 'rollback')
            await app.db.controllers.Project.importProjectSnapshot(request.project, snapshot)
            app.db.controllers.Project.clearInflightState(request.project)
            await app.auditLog.Project.project.snapshot.rolledBack(request.session.User, null, request.project, snapshot)
            if (restartProject) {
                await app.containers.restartFlows(request.project)
            }
            reply.send({ status: 'okay' })
        } catch (err) {
            app.db.controllers.Project.clearInflightState(request.project)

            const resp = { code: 'unexpected_error', error: err.toString() }
            await app.auditLog.Project.project.snapshot.rolledBack(request.session.User, resp, request.project)
            reply.code(500).send(resp)
        }
    })

    app.post('/restartStack', changeStatusPreHandler, async (request, reply) => {
        try {
            await app.auditLog.Project.project.stack.restart(request.session.User, null, request.project)
            if (request.project.state !== 'suspended') {
                app.db.controllers.Project.setInflightState(request.project, 'suspending')
                await app.containers.stop(request.project)
                app.db.controllers.Project.clearInflightState(request.project)
                await app.auditLog.Project.project.suspended(request.session.User, null, request.project)
            }

            request.project.state = 'running'
            await request.project.save()
            app.db.controllers.Project.setInflightState(request.project, 'starting')
            const startResult = await app.containers.start(request.project)
            startResult.started.then(async () => {
                await app.auditLog.Project.project.started(request.session.User, null, request.project)
                app.db.controllers.Project.clearInflightState(request.project)
            })

            reply.send()
        } catch (err) {
            app.db.controllers.Project.clearInflightState(request.project)

            const resp = { code: 'unexpected_error', error: err.toString() }
            await app.auditLog.Project.project.stack.restart(request.session.User, resp, request.project)
            reply.code(500).send(resp)
        }
    })
}
