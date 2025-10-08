/**
 * Project Action api routes
 *
 * request.project will be defined for any route defined in here
 *
 * - /api/v1/projects/:instanceId/actions/
 *
 * @namespace project
 * @memberof forge.routes.api
 */
module.exports = async function (app) {
    app.post('/start', {
        preHandler: app.needsPermission('project:change-status'),
        schema: {
            summary: 'Start an instance',
            tags: ['Instance Actions'],
            params: {
                type: 'object',
                properties: {
                    instanceId: { type: 'string' }
                }
            },
            response: {
                200: {
                    $ref: 'APIStatus'
                },
                '4xx': {
                    $ref: 'APIError'
                },
                500: {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        try {
            if (request.project.state === 'suspended') {
                try {
                    // This will perform all checks needed to ensure this instance
                    // can be unsuspended
                    await request.project.Team.checkInstanceStartAllowed(request.project)
                } catch (err) {
                    reply.code(err.statusCode || 400).send({ code: err.code || 'unexpected_error', error: err.error || err.message })
                    return
                }

                // Restart the container
                request.project.state = 'running'
                await request.project.save()
                await app.db.controllers.Project.setInflightState(request.project, 'starting')
                const startResult = await app.containers.start(request.project)
                startResult.started.then(async () => {
                    await app.auditLog.Project.project.started(request.session.User, null, request.project)
                    await app.db.controllers.Project.clearInflightState(request.project)
                    return true
                }).catch(err => {
                    app.log.info(`failed to start project ${request.project.id}`)
                    throw err
                })
            } else {
                await app.db.controllers.Project.setInflightState(request.project, 'starting')
                request.project.state = 'running'
                await request.project.save()
                await app.containers.startFlows(request.project)
                await app.auditLog.Project.project.started(request.session.User, null, request.project)
                await app.db.controllers.Project.clearInflightState(request.project)
            }
            reply.send({ status: 'okay' })
        } catch (err) {
            await app.db.controllers.Project.clearInflightState(request.project)

            const resp = { code: 'unexpected_error', error: err.toString() }
            await app.auditLog.Project.project.started(request.session.User, resp, request.project)
            reply.code(500).send(resp)
        }
    })

    app.post('/stop', {
        preHandler: app.needsPermission('project:change-status'),
        schema: {
            summary: 'Stop an instance',
            tags: ['Instance Actions'],
            params: {
                type: 'object',
                properties: {
                    instanceId: { type: 'string' }
                }
            },
            response: {
                200: {
                    $ref: 'APIStatus'
                },
                '4xx': {
                    $ref: 'APIError'
                },
                500: {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        try {
            if (request.project.state === 'suspended') {
                reply.code(400).send({ code: 'project_suspended', error: 'Project suspended' })
                return
            }
            await app.db.controllers.Project.setInflightState(request.project, 'stopping')
            request.project.state = 'stopped'
            await request.project.save()
            await app.containers.stopFlows(request.project)
            await app.auditLog.Project.project.stopped(request.session.User, null, request.project)
            await app.db.controllers.Project.clearInflightState(request.project)
            reply.send({ status: 'okay' })
        } catch (err) {
            await app.db.controllers.Project.clearInflightState(request.project)

            const resp = { code: 'unexpected_error', error: err.toString() }
            await app.auditLog.Project.project.stopped(request.session.User, resp, request.project)
            reply.code(500).send(resp)
        }
    })

    app.post('/restart', {
        preHandler: app.needsPermission('project:change-status'),
        schema: {
            summary: 'Restart an instance',
            tags: ['Instance Actions'],
            params: {
                type: 'object',
                properties: {
                    instanceId: { type: 'string' }
                }
            },
            response: {
                200: {
                    $ref: 'APIStatus'
                },
                '4xx': {
                    $ref: 'APIError'
                },
                500: {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        try {
            if (request.project.state === 'suspended') {
                reply.code(400).send({ code: 'project_suspended', error: 'Project suspended' })
                return
            }
            await app.db.controllers.Project.setInflightState(request.project, 'restarting')
            request.project.state = 'running'
            await request.project.save()
            await app.containers.restartFlows(request.project)
            await app.auditLog.Project.project.restarted(request.session.User, null, request.project)
            await app.db.controllers.Project.clearInflightState(request.project)
            reply.send({ status: 'okay' })
        } catch (err) {
            await app.db.controllers.Project.clearInflightState(request.project)

            const resp = { code: 'unexpected_error', error: err.toString() }
            await app.auditLog.Project.project.restarted(request.session.User, resp, request.project)
            reply.code(500).send(resp)
        }
    })

    app.post('/suspend', {
        preHandler: app.needsPermission('project:change-status'),
        schema: {
            summary: 'Suspend an instance',
            tags: ['Instance Actions'],
            params: {
                type: 'object',
                properties: {
                    instanceId: { type: 'string' }
                }
            },
            response: {
                200: {
                    $ref: 'APIStatus'
                },
                '4xx': {
                    $ref: 'APIError'
                },
                500: {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        try {
            if (request.project.state === 'suspended') {
                reply.code(400).send({ code: 'project_suspended', error: 'Project suspended' })
                return
            }
            await app.db.controllers.Project.setInflightState(request.project, 'suspending')
            await app.containers.stop(request.project)
            await app.db.controllers.Project.clearInflightState(request.project)
            await app.auditLog.Project.project.suspended(request.session.User, null, request.project)
            reply.send({ status: 'okay' })
        } catch (err) {
            await app.db.controllers.Project.clearInflightState(request.project)

            const resp = { code: 'unexpected_error', error: err.toString() }
            await app.auditLog.Project.project.suspended(request.session.User, resp, request.project)
            reply.code(500).send(resp)
        }
    })

    app.post('/rollback', {
        preHandler: app.needsPermission('project:snapshot:rollback'),
        schema: {
            summary: 'Rollback an instance to a snapshot',
            tags: ['Instance Actions'],
            params: {
                type: 'object',
                properties: {
                    instanceId: { type: 'string' }
                }
            },
            body: {
                type: 'object',
                properties: {
                    snapshot: { type: 'string' }
                }
            },
            response: {
                200: {
                    $ref: 'APIStatus'
                },
                '4xx': {
                    $ref: 'APIError'
                },
                500: {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        let restartProject = false
        try {
            // get (and check) snapshot is valid / owned by project before any actions
            const snapshot = await app.db.models.ProjectSnapshot.byId(request.body.snapshot)
            if (!snapshot) {
                reply.code(400).send({ code: 'invalid_snapshot', error: `snapshot '${request.body.snapshot}' not found for project '${request.project.id}'` })
                return
            }
            if (snapshot.ProjectId !== request.project.id) {
                reply.code(400).send({ code: 'invalid_snapshot', error: `snapshot '${request.body.snapshot}' not found for project '${request.project.id}'` })
                return
            }
            if (request.project.state === 'running') {
                restartProject = true
            }
            await app.db.controllers.Project.setInflightState(request.project, 'rollback')
            await app.db.controllers.Project.importProjectSnapshot(request.project, snapshot)
            await app.db.controllers.Project.clearInflightState(request.project)
            await app.auditLog.Project.project.snapshot.rolledBack(request.session.User, null, request.project, snapshot)
            if (restartProject) {
                await app.containers.restartFlows(request.project)
            }
            reply.send({ status: 'okay' })
        } catch (err) {
            await app.db.controllers.Project.clearInflightState(request.project)
            const resp = { code: 'unexpected_error', error: err.toString() }
            await app.auditLog.Project.project.snapshot.rolledBack(request.session.User, resp, request.project)
            reply.code(500).send(resp)
        }
    })

    app.post('/restartStack', {
        preHandler: app.needsPermission('project:change-status'),
        schema: {
            summary: 'Restart an instance stack',
            tags: ['Instance Actions'],
            params: {
                type: 'object',
                properties: {
                    instanceId: { type: 'string' }
                }
            },
            response: {
                200: {
                    $ref: 'APIStatus'
                },
                '4xx': {
                    $ref: 'APIError'
                },
                500: {
                    $ref: 'APIError'
                }
            }
        }
    }, async (request, reply) => {
        try {
            await app.auditLog.Project.project.stack.restart(request.session.User, null, request.project)
            if (request.project.state !== 'suspended') {
                await app.db.controllers.Project.setInflightState(request.project, 'suspending')
                await app.containers.stop(request.project)
                await app.db.controllers.Project.clearInflightState(request.project)
                await app.auditLog.Project.project.suspended(request.session.User, null, request.project)
            }

            request.project.state = 'running'
            await request.project.save()
            await app.db.controllers.Project.setInflightState(request.project, 'starting')
            const startResult = await app.containers.start(request.project)
            startResult.started.then(async () => {
                await app.auditLog.Project.project.started(request.session.User, null, request.project)
                await app.db.controllers.Project.clearInflightState(request.project)
                return true
            }).catch(err => {
                app.log.info(`failed to restartStack for ${request.project.id}`)
                throw err
            })

            reply.send()
        } catch (err) {
            await app.db.controllers.Project.clearInflightState(request.project)

            const resp = { code: 'unexpected_error', error: err.toString() }
            await app.auditLog.Project.project.stack.restart(request.session.User, resp, request.project)
            reply.code(500).send(resp)
        }
    })
}
